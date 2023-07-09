var isDebugMode = true;
var lessonLanguage;
var dbfire;
const wordsPerPage = 100;
const pagesToLookAheadBehind = 2;
var scrollDebounceTimer = null;
const scrollDebounceTimeout = 40;
const colouriseTimeout = 5;
const saveVocabularyTimeout = 4000;
const saveTextTimeout = 5000;
var pageMax;
var wordlistTable;
var colourisePending;
var colouriseInProgress;
var vocabularySaveInProgress;
var signedInState = "signedOut";
var db;
var	vocabularyLearning;
var	vocabularyKnown;
//var	vocabularyUnknown;
var lessonWordArray;
var lessonTotalWordCount;
var lessonSavingEnabled;
var lessonID;
var saveTextTimer = null;
var saveVocabularyTimer = null;
var colourisePageTimeout = null;
var naverDictionaryLanguage;
var sidebarTab;
var pendingDictionaryLookup ="";
var currentJumpIndex = 0;  // to track current highlighted word
var currentJumpWord = "";  // to track current word
var lessonUniqueWordCount;
var totalCounts;
var uniqueCounts;
var sentences;


const firebaseConfig = {
		apiKey: "AIzaSyDOZA0ojbWAaeWwx0gL7kenlNm94Fo38BY",
		authDomain: "korean-reader.firebaseapp.com",
		databaseURL: "https://korean-reader.firebaseio.com",
		projectId: "korean-reader",
		storageBucket: "korean-reader.appspot.com",
		messagingSenderId: "410562108352",
		appId: "1:410562108352:web:f42d6c8b329d8e54460625"
};

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('loading-overlay').style.display = 'flex'; // Show loading overlay
	initialiseCredentials();
	//initialiseCredentials().then(() => {
		//console.log("User's authentication state has been determined.");
	//	initialise();
	//});
	
});

function p(...messages) {
  if (isDebugMode) {
    console.log(...messages);
  }
}

function initialise(){
    p("Start initialise");
	document.getElementById('loading-overlay').style.display = 'flex'; // Show loading overlay
	lessonSavingEnabled=false;
	vocabularySaveInProgress = false;
	colouriseInProgress = false;
	colourisePending = false;
	lessonTotalWordCount=0;
	lessonWordArray=[];
	totalCounts=[];
	uniqueCounts=[];
	sentences=[];
	pageMax=0;
	lessonLanguage = "korean";
	naverDictionaryLanguage="en";
	vocabularyLearning = new Set();
    vocabularyKnown = new Set();
	document.querySelector('#dictionary-iframe').src = 'https://en.dict.naver.com/#/main';
	pendingDictionaryLookup ="";
	
	resetJump();

    //vocabularyUnknown = new Set();
	if (saveTextTimer !== null) {
        clearTimeout(saveTextTimer);
    }
	if (scrollDebounceTimer !== null) {
            clearTimeout(scrollDebounceTimer);
    }
	if (saveVocabularyTimer !== null) {
            clearTimeout(saveVocabularyTimer);
    }
	if (colourisePageTimeout !== null) {
            clearTimeout(colourisePageTimeout);
    }
	
	p("Begin initialise IndexedDB");
    initialiseIndexedDB().then(() => {
        p("Completed initialiseIndexedDB");
        return initialiseVocabulary();
    }).then(() => {
        p("Completed initialiseVocabulary");
        return initialiseUI();
    }).then(() => {
        initialiseTextSaving();
		document.getElementById('loading-overlay').style.display = 'none';
		initialiseDataTables();
		 p("Initialisation complete");
    }).catch((error) => {
        console.error("An error occurred:", error);
    });
}

function checkWordInVocabularies(word) {
	var str="";
    if (vocabularyLearning.has(word)) {
        str+= 'learning';
    } else if (vocabularyKnown.has(word)) {
        str+= 'known';
    } //else if (vocabularyUnknown.has(word)) {
     //   str+= 'unknown';
    //}
	else {
        return 'not found';
    }
	return str;
}


function onTextareaInput() {
	if (saveTextTimer !== null) {
			clearTimeout(saveTextTimer);
		}

		saveTextTimer = setTimeout(() => {
			if(lessonSavingEnabled){
				var lesson = {
					title: lessonID,
					text: document.getElementById('editText').value
				};
				
				saveCustomLessonToIndexedDB(lesson);
				p("lesson saved");
			}
			saveTextTimer = null;
		}, saveTextTimeout);
}


function initialiseTextSaving(){
	const textarea = document.getElementById('editText');
	
	// Remove the existing listener, if it exists
    textarea.removeEventListener('input', onTextareaInput);

    // Add the listener
    textarea.addEventListener('input', onTextareaInput);
}

/*
function initialiseCredentials() {
    firebase.initializeApp(firebaseConfig);
    dbfire = firebase.firestore();
    return new Promise(resolve => {
        firebase.auth().onAuthStateChanged(async user => {
            try {
                await onAuthStateChanged(user);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}
*/

function initialiseCredentials() {
    firebase.initializeApp(firebaseConfig);
    dbfire = firebase.firestore();
    firebase.auth().onAuthStateChanged(user => {
        onAuthStateChanged(user);
    });
}


async function onAuthStateChanged(user) {
    if (user) {
        p("User has logged in.");
        //logUser(user);
        displaySigninElements("signedInMode");
        signedInState="signedIn";
		////
		////
        // Wait for the migration to finish
        //await checkAndMigrateData(user.uid);
    } else {
        if (window.location.protocol === "file:") {
            displaySigninElements("offlineMode");
            signedInState="offline";
        } else {
            displaySigninElements("signedOutMode");
            signedInState="signedOut";
        }
    }
    initialise();
}

function checkAndMigrateData(lang, uid) {
    // Check if the migration has already been done
    let migrationFlagRef = dbfire.collection('migrationFlags').doc(uid);

    // Note the new return here
    return migrationFlagRef.get()
        .then((doc) => {
            if (!doc.exists) {
                // If the flag does not exist, run the migration
                return migrateData(lang, uid); // This function also needs to return a Promise
            } else {
                p(`Migration has already been done`);
                return Promise.resolve(); // Resolve immediately if no migration is necessary
            }
        })
        .catch((error) => {
            console.error(`Error checking migration flag:`, error);
            return Promise.reject(error); // Important to reject promise in case of error
        });
}

async function migrateData(uid, lang) {
    p("Migrating data...");
    let knownWords = [];
    let learningWords = [];
    let types = ["known", "learning"];
    
    try {
        for (let type of types) {
            let querySnapshot;
			try {
				querySnapshot = await dbfire.collection('vocabulary')
								.where("author_uid", "==", uid)
								.where("language", "==", lang)
								.where("type", "==", type)
								.get();
			} catch(error) {
				console.error('Error occurred while fetching data:', error);
			}

            if (querySnapshot.empty) {
                console.log(`No documents found for type ${type}.`);
                continue;
            }

            querySnapshot.forEach((doc) => {
                if (type === "known") {
                    knownWords.push(doc.data().word);
                } else if (type === "learning") {
                    learningWords.push(doc.data().word);
                }
            });
        }

        // Print out the arrays
        console.log("Known words: ", knownWords);
        console.log("Learning words: ", learningWords);

        if(knownWords.length == 0 && learningWords.length == 0) {
            console.log("No documents to migrate found");
            // Update migration flag
            //await dbfire.collection('migrationFlags').doc(uid).set({migrated: true});

            p("Data migration complete.");
            return; // End execution here
        }

        // Here you can write these words to your new collection/document
        // Example:
		/*
        await dbfire.collection('vocabulary').add({
            "author_uid": uid,
            "language": lang,
            "type": "vocab_v2",
            "known": knownWords,
            "learning": learningWords
        });
		*/

        // Update migration flag
        //await dbfire.collection('migrationFlags').doc(uid).set({migrated: true});

        p("Data migration complete.");
    } catch (error) {
        console.error("Error migrating data: ", error);
    }
}












function printFireDBVocabItems(uid,lang) {
    return dbfire.collection("vocabulary")
        .where("author_uid", "==", uid)
		.where("language", "==", lang)
        .get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                const docData = doc.data();
                console.log(`Document ID: ${doc.id}`);
                console.log(`Type: ${docData.type}`);
                console.log(`Language: ${docData.language}`);
                console.log(`Words: ${docData.words}`);
            });
        })
        .catch(function(error) {
            console.error("Error getting documents: ", error);
        });
}


function onNavLearnScroll(e) {
    if (scrollDebounceTimer !== null) {
            clearTimeout(scrollDebounceTimer);
        }
		scrollDebounceTimer = setTimeout(() => {
			let visibleSpans = findVisibleSpans();
			setActiveText(visibleSpans.firstVisible,visibleSpans.lastVisible);
			if (!colouriseInProgress) {
                    colouriseInProgress = true;
                    colourisePage();
            }
			
		}, scrollDebounceTimeout);
}

function onTextareaFullscreenButtonClick() {
	var textareaContainer = document.querySelector('.textarea-container');
	var sidebarContainer = document.querySelector('.sidebar-container');
	
	if(sidebarContainer.classList.contains('hidden')) {
				  sidebarContainer.classList.remove('hidden');
				  textareaContainer.classList.remove('full-width');
				} else {
				  sidebarContainer.classList.add('hidden');
				  textareaContainer.classList.add('full-width');
				  sidebarContainer.classList.remove('full-width');
			}
	
	
}

function onSidebarFullscreenButtonClick() {
	var textareaContainer = document.querySelector('.textarea-container');
	var sidebarContainer = document.querySelector('.sidebar-container');
	
	if(textareaContainer.classList.contains('hidden')) {
				  textareaContainer.classList.remove('hidden');
				  sidebarContainer.classList.remove('full-width');
				} else {
				  textareaContainer.classList.add('hidden');
				  sidebarContainer.classList.add('full-width');
				  textareaContainer.classList.remove('full-width');
			}
}

function onNavLearnTabShowBsTab(e) {
    p("Loading text into learn tab");
				loadTextIntoLearnTab(document.getElementById('editText').value,lessonLanguage);
				document.getElementById('nav-learn').dispatchEvent(new Event('scroll'));
}

function onClearTextButtonClick() {
    document.getElementById('editText').value = '';	
				activateEditTab();
}


function onStatisticsTabButtonClick() {
    sidebarTab = "statistics";
	p("Statistics tab opened");
}

function onSentencesTabButtonClick() {
    sidebarTab = "sentences";
	//lessonSentenceArray.forEach((sentence, index) => {
	//	p(`Sentence ${index + 1}: ${sentence}`);
	//});
	
	p("Sentences tab opened");
}

function onDictionaryTabButtonClick() {
    sidebarTab = "dictionary";
	handleDictionaryLookup();
	p("Dictionary tab opened");
}

function onWordlistTabButtonClick() {
    sidebarTab = "wordlist";
	//if (!$.fn.DataTable.isDataTable('#wordlistTable')) {
        // If the table does not exist, fill the table first
    //    fillWordlistTable();
   // }
	p("Wordlist tab opened");
}


function initialiseUI(){
	return new Promise((resolve, reject) => {
		
		var navLearn = document.getElementById('nav-learn');
		  var textareaFullscreenButton = document.getElementById('textareaFullscreenButton');
		  var sidebarFullscreenButton = document.getElementById('sideBarFullscreenButton');
		  var navLearnTab = document.getElementById('nav-learn-tab');
		  var clearTextButton = document.getElementById('nav-clear-tab');
		  var statisticsTabButton = document.getElementById('statistics-tab');
		  var sentencesTabButton = document.getElementById('sentences-tab');
		  var wordlistTabButton = document.getElementById('wordlist-tab');
		  var dictionaryTabButton = document.getElementById('dictionary-tab');
		  
		statisticsTabButton.removeEventListener('click',onStatisticsTabButtonClick);
		sentencesTabButton.removeEventListener('click',onSentencesTabButtonClick);
		wordlistTabButton.removeEventListener('click',onWordlistTabButtonClick);
		dictionaryTabButton.removeEventListener('click',onDictionaryTabButtonClick);
		navLearn.removeEventListener('scroll', onNavLearnScroll);
        textareaFullscreenButton.removeEventListener('click', onTextareaFullscreenButtonClick);
        sidebarFullscreenButton.removeEventListener('click', onSidebarFullscreenButtonClick);
        navLearnTab.removeEventListener('show.bs.tab', onNavLearnTabShowBsTab);
        clearTextButton.removeEventListener('click', onClearTextButtonClick);

		navLearn.addEventListener('scroll', onNavLearnScroll);
        textareaFullscreenButton.addEventListener('click', onTextareaFullscreenButtonClick);
        sidebarFullscreenButton.addEventListener('click', onSidebarFullscreenButtonClick);
        navLearnTab.addEventListener('show.bs.tab', onNavLearnTabShowBsTab);
        clearTextButton.addEventListener('click', onClearTextButtonClick);
		statisticsTabButton.addEventListener('click',onStatisticsTabButtonClick);
		sentencesTabButton.addEventListener('click',onSentencesTabButtonClick);
		wordlistTabButton.addEventListener('click',onWordlistTabButtonClick);
		dictionaryTabButton.addEventListener('click',onDictionaryTabButtonClick);
		
		
		document.getElementById('dictionary-tab').click();
		  
		  lessonID = sessionStorage.getItem('lessonID');
			if(lessonID) {
				saveLastOpenedLessonID();
				loadLesson();
			} else {
				getLastOpenedLessonID(function(lastOpenedLessonID) {
					p("lessonID: "+lessonID);
					if(lastOpenedLessonID) {
						lessonID = lastOpenedLessonID;
						saveLastOpenedLessonID();
						loadLesson();
					} else {
						window.location.href = 'content.html';
					}
				});
			}

		  

	
	resolve();
    });
}


window.handleCredentialResponse = (response) => {
	onSignIn(); 
}
	
	function toggleSignIn() {
      if (firebase.auth().currentUser) {
		handleSignOut();
		displaySigninElements("signedOutMode");
      } else {
        var email = document.getElementById('signin-email').value;
        var password = document.getElementById('signin-password').value;
        if (email.length < 4) {
          alert('Please enter an email address.');
          return;
        }
        if (password.length < 4) {
          alert('Please enter a password.');
          return;
        }
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
          var errorCode = error.code;
          var errorMessage = error.message;
          if (errorCode === 'auth/wrong-password') {
            alert('Wrong password.');
          } else {
            alert(errorMessage);
          }
          p(error);
		  p("Signed in with email");
		  displaySigninElements("signedInMode");
        });
      }
    }

	function onSignIn(googleUser) {
		p("at sign in");
		var provider = new firebase.auth.GoogleAuthProvider();
		firebase.auth()
		  .signInWithPopup(provider)
		  .then((result) => {
			/** @type {firebase.auth.OAuthCredential} */
			var credential = result.credential;
			var token = credential.accessToken;
			var user = result.user;
			  p("Signed in with Google");
			  displaySigninElements("signedInMode");
		  }).catch((error) => {
			var errorCode = error.code;
			var errorMessage = error.message;
			var email = error.email;
			var credential = error.credential;
		  });
    }
	
	function handleSignOut() {
		firebase.auth().signOut().then(() => {
		  displaySigninElements("signedOutMode");
		}).catch((error) => {
			
		});
	}

function displaySigninElements(state)
{
	switch(state)
	{
			case "offlineMode":
				document.getElementById('loginButton').style.display = 'none';
				document.getElementById("loggedInState").innerText = "Working in offline mode";
				document.getElementById("loginButton").innerText = "Sign in";
			break;
			case "signedOutMode":
				document.getElementById('loginButton').style.display = '';
				document.getElementById("loggedInState").innerText = "Working in signed-out mode";
				document.getElementById("loginButton").innerText = "Sign in";
			break;
			case "signedInMode":
				document.getElementById('loginButton').style.display = '';
				document.getElementById("loggedInState").innerText = "Signed in";
				document.getElementById("loginButton").innerText = "Sign out";
			break;
	}
}
	
function logUser(user)
{
	dbfire.collection("users").doc(user.uid).set({
		name: user.displayName,
		email: user.email,
		verified: user.emailVerified,
		author_uid: user.uid
	})
	.then(function() {
		p("User logged in");
	})
	.catch(function(error) {
		console.error("Error writing document: ", error);
	});
}




function loadLesson() {
  p("Loading lesson:", lessonID);
	if (/^custom\d+$/.test(lessonID)) {
		p("Custom lesson loading...");
		initCustomLesson();
	}
	else{
	  fetch(`lessons/${lessonID}.json`)
		.then(response => {
		  if (!response.ok) {
			throw new Error('Lesson failed to load');
		  }
		  return response.json();
		})
		.then(lesson => {
			p("Premade lesson loading...");
			initPremadeLesson(lesson.title, lesson.text);
		})
		.catch(error => console.error('Error:', error));
	}
}

function activateEditTab(){
	if (!document.getElementById('nav-edit-tab').classList.contains('active')) {
		document.getElementById('nav-edit-tab').classList.add('active');
		document.getElementById('nav-edit').classList.add('show', 'active');

		document.getElementById('nav-learn-tab').classList.remove('active');
		document.getElementById('nav-learn').classList.remove('show', 'active');
	}
}

function activateLearnTab(){
	if (!document.getElementById('nav-learn-tab').classList.contains('active')) {

		document.getElementById('nav-learn-tab').classList.add('active');
		document.getElementById('nav-learn').classList.add('show', 'active');


		document.getElementById('nav-edit-tab').classList.remove('active');
		document.getElementById('nav-edit').classList.remove('show', 'active');
	}
	document.getElementById('nav-learn-tab').dispatchEvent(new Event('show.bs.tab'));
	document.getElementById('nav-learn').dispatchEvent(new Event('scroll'));
}

function initPremadeLesson(title, text){
	document.getElementById('nav-clear-tab').disabled=true;
	
	document.getElementById('textarea-navbar-title').innerText = title;
	lessonSavingEnabled=false;
	const textarea = document.getElementById('editText');
	textarea.value = text;
    
    textarea.dispatchEvent(new Event('input'));
	activateLearnTab();
}

function formatTitle(title) {
    // Split the title into words (assuming the format is always "custom1", "custom2", etc.)
    let words = title.split(/(\d+)/);  // This will split the title into ["custom", "1"]

    // Convert the first character of the first word to uppercase
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);

    // Join the words back together with a space in between
    let formattedTitle = words.join(' ');

    return formattedTitle;
}

function initCustomLesson(){
	document.getElementById('nav-clear-tab').disabled=false;
	
	document.getElementById('textarea-navbar-title').innerText = formatTitle(lessonID);
	lessonSavingEnabled=true;
	activateEditTab();
	
	if(signedInState=="offline"||signedInState=="signedOut"){
		getCustomLessonFromIndexedDB(lessonID, function(lesson) {
			if(lesson){
				const textarea = document.getElementById('editText');
				textarea.value = lesson.text;
				textarea.dispatchEvent(new Event('input'));
			}
		});
	}
	else{
		//TODO instead of this, use the firedb
		getCustomLessonFromIndexedDB(lessonID, function(lesson) {
			if(lesson){
				const textarea = document.getElementById('editText');
				textarea.value = lesson.text;
				textarea.dispatchEvent(new Event('input'));
			}
		});
	}
}




function loadTextIntoLearnTab(text, language) {
    const learnTextElement = document.getElementById('learnText');
    // Split the text into sentences
    let rawSentences = text.split(/(?<=[.!?。？！\n])/);
    let chunks = [];
	sentences=[];
    let sentenceIndex = 0;
    rawSentences.forEach((sentence) => {
        let sentenceChunks = sentence.split(/(\s|\n)/).flatMap((chunk) => {
            if(/\n/.test(chunk)) {
                // If the chunk is a newline, return a <br> element
                return '<span class="non-text"><br></span>';
            } else if (/\s/.test(chunk)) {
                // If the chunk is whitespace, return it as-is
                return `<span class="non-text" data-sentence="${sentenceIndex}">&nbsp;</span>`;
            } else {
                let subChunks;
                // Further split the chunk into Korean and non-Korean text
                if (language == "korean") {
                    subChunks = chunk.split(/([\uAC00-\uD7AF]+)/).filter(Boolean);
                } 
                // For English, include only latin letters
                else if (language == "en") {
                    subChunks = chunk.split(/([a-zA-Z]+)/).filter(Boolean);
                }
                // For Chinese, include only Chinese characters
                else if (language == "cn") {
                    subChunks = chunk.split(/([\p{Script=Han}]+)/u).filter(Boolean);
                }
                return subChunks.map((subChunk) => {
                    if ((language == "korean" && /[\uAC00-\uD7AF]/.test(subChunk)) ||
                        (language == "en" && /[a-zA-Z]/.test(subChunk)) ||
                        (language == "cn" && /[\p{Script=Han}]/u.test(subChunk))) {
                        // If the subChunk is in the appropriate language, wrap it in a span with a 'sentence' data attribute
                        return `<span class="clickable-word" data-sentence="${sentenceIndex}">${subChunk}</span>`;
                    } else {
                        // If the subChunk is not a word (or if the language is not correct), it's non-text
                        return `<span class="non-text" data-sentence="${sentenceIndex}">${subChunk}</span>`;
                    }
                });
            }
        });
        chunks = chunks.concat(sentenceChunks);
        sentenceIndex++;
    });

    // Divide the chunks into pages
    const pages = [];
    while (chunks.length) {
        pages.push(chunks.splice(0, wordsPerPage));
    }

    // Clear the current content
    learnTextElement.innerHTML = '';

    // Create and render the pages
    pages.forEach((page, index) => {
        const pageElement = document.createElement('span');
        pageElement.className = 'page';
        pageElement.id = index;
        pageElement.innerHTML = page.join('');
        learnTextElement.appendChild(pageElement);
    });
    pageMax = pages.length-1;

    // ...
	var words = learnTextElement.querySelectorAll('.clickable-word');
	var lessonText = [];
	words.forEach(word => {
		lessonText.push(word.textContent);
		word.addEventListener('click', onWordClick);
	});
	initialiseLessonText(lessonText);
	fillWordlistTable();

	words = learnTextElement.querySelectorAll('.clickable-word, .non-text');
	// construct sentencs
	words.forEach((word, index) => {
		let sentenceIndex = word.dataset.sentence;
		if (!sentences[sentenceIndex]) {
			sentences[sentenceIndex] = {
				sentenceIndex: sentenceIndex,
				sentence: word.textContent,
				clickableWords: word.classList.contains('clickable-word') ? [word.textContent] : [],
			};
		} else {
			sentences[sentenceIndex].sentence += word.textContent;
			if (word.classList.contains('clickable-word')) {
				sentences[sentenceIndex].clickableWords.push(word.textContent);
			}
		}
	});
	
	let currentIndex = 1; // Initialize the currentIndex
	sentences.forEach((sentence, index) => {
		if (sentence.clickableWords.length > 0) {
			sentence.validSentenceIndex = currentIndex;
			currentIndex++;
		} else {
			delete sentences[index]; // Remove the sentence from the array
		}
});
	sentences = sentences.filter(Boolean);
	fillSentencelistTable();

}




function onWordClick() {
    const wordText = this.textContent;
    handleWordClick(wordText);
}

function findVisibleSpans() {
    const spans = document.querySelectorAll('.page');
    let firstVisible, lastVisible;

    for (let i = 0; i < spans.length; i++) {
        const rect = spans[i].getBoundingClientRect();
        
        const isVisible = rect.top < window.innerHeight && rect.bottom >= 0 &&
                          rect.left < window.innerWidth && rect.right >= 0;

        if (isVisible) {
            if (!firstVisible) firstVisible = parseInt(spans[i].id);
            lastVisible = parseInt(spans[i].id); 
        }
    }

    return {
        firstVisible: firstVisible,
        lastVisible: lastVisible
    };
}

function handleWordClick(word) {
	if(currentJumpWord!=""){
			if(word==currentJumpWord){
				resetJump();
				return;
			}
			else{
				resetJump();
			}
	}
    var newLevel = promoteOneLevel(word);
	//delete colourised class from all pages
	const pages = document.querySelectorAll('.page.colourised');

    pages.forEach(page => {
        page.classList.remove('colourised');
	});
	colourisePending = true;
	if (!colouriseInProgress) {
        colouriseInProgress = true;
        colourisePage();
    }
	
	if (!vocabularySaveInProgress) {
        vocabularySaveInProgress = true;
		
		if (saveVocabularyTimer !== null) {
            clearTimeout(saveVocabularyTimer);
        }
		saveVocabularyTimer = setTimeout(saveVocabulary, saveVocabularyTimeout); 
        
    }
	pendingDictionaryLookup=word;
	handleDictionaryLookup();
	updateWordInTable(word,newLevel);
}

function promoteOneLevel(word){
	var newLevel="";
	let wordObj = lessonWordArray.find(w => w.word === word);
	if(!wordObj){
		console.error("Word "+word+" not found in lesson text.");
	}
	
	switch(wordObj.level){
		case "known":
			newLevel="unknown"
			wordObj.level = newLevel;
			vocabularyKnown.delete(word);
			//vocabularyUnknown.add(word);
			break;
		case "learning":
			newLevel="known"
			wordObj.level = newLevel;
			vocabularyLearning.delete(word);
			vocabularyKnown.add(word);
			break;
		case "unknown":
			newLevel="learning"
			wordObj.level = newLevel;
			//vocabularyUnknown.delete(word);
			vocabularyLearning.add(word);
			break;
		default: console.error("Word "+word+" has an invalid level.");
	}
	return newLevel
}

function setActiveText(firstVisible,lastVisible){
    let firstActivePage = Math.max(0, firstVisible - pagesToLookAheadBehind);
    let lastActivePage = Math.min(pageMax, lastVisible + pagesToLookAheadBehind);
    const pages = document.querySelectorAll('.page');
    
    pages.forEach((page, index) => {
        if(index >= firstActivePage && index <= lastActivePage) {
            if(!page.classList.contains("active")) {
                page.classList.add('active');
                colourisePending = true;
            }
        } else {
            if(page.classList.contains("active")) {
                page.classList.remove('active');
            }
        }
    });
}

function colourisePage() {
    if (colourisePending) {
		const page = document.querySelector('.page.active:not(.colourised)');
		if(page)
		{
			page.classList.add('colourised');
			const clickableWords = page.querySelectorAll('span.clickable-word');
			clickableWords.forEach(word => {
				const wordText = word.textContent
				let wordObj = lessonWordArray.find(w => w.word === wordText);
				if(!wordObj){
					console.error("Word "+wordText+" not found in lesson text.");
				}
				switch(wordObj.level){
					case "known":
						word.classList.add('known');
						word.classList.remove('learning');
						word.classList.remove('unknown');
						break;
					case "learning":
						word.classList.add('learning');
						word.classList.remove('known');
						word.classList.remove('unknown');
						break;
					case "unknown":
						word.classList.add('unknown');
						word.classList.remove('known');
						word.classList.remove('learning');
						break;
					default: console.error("Word "+wordText+" has an invalid level.");
				}
			});
		}
		else
		{
			colourisePending = false;
			colouriseInProgress = false;
			return;
		}
		colouriseInProgress = false;
		
		if (colourisePageTimeout !== null) {
            clearTimeout(colourisePageTimeout);
		}
		
        colourisePageTimeout = setTimeout(colourisePage, colouriseTimeout); 
    }
	else
	{
		colouriseInProgress = false;
	}
}

function initialiseIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            const errorMessage = "Your browser doesn't support a stable version of IndexedDB";
            alert(errorMessage);
            p(errorMessage);
            reject(new Error(errorMessage));
        } else {
            var request = indexedDB.open("wordsdb", 9);
            request.onupgradeneeded = function() {
				p("here1!");
                db = request.result;
                if (!db.objectStoreNames.contains('wordsdb')) {
                    var store = db.createObjectStore("wordsdb", {keyPath: "word"});
                    //var appearancesIndex = store.createIndex("by_appearance", "appearance");
                }
                if (!db.objectStoreNames.contains('lessonsdb')) {
                    var lessonStore = db.createObjectStore("lessonsdb", {keyPath: "title"});
                }
                if (!db.objectStoreNames.contains('settings')) {
                    var settingsStore = db.createObjectStore("settings", {keyPath: "id"});
                }
            };
			request.onblocked = function(event) {
				p("Request blocked!");
			};

			request.onsuccess = function(event) {
				p("Request succeeded!");
			};
            request.onerror = function(event) {
                const errorMessage = "Database error: " + event.target.errorCode;
                p(errorMessage);
                reject(new Error(errorMessage));
            };
            request.onsuccess = function() {
                db = request.result;
                resolve();
            };
        }
    });
}

/*
function initialiseIndexedDB(callback) {
    if (!window.indexedDB) {
        alert("Your browser doesn't support a stable version of IndexedDB");
        p("Your browser doesn't support a stable version of IndexedDB");
    } else {		
        var request = indexedDB.open("wordsdb", 7);
        request.onupgradeneeded = function() {
            db = request.result;
            if (!db.objectStoreNames.contains('wordsdb')) {
                var store = db.createObjectStore("wordsdb", {keyPath: "word"});
                var appearancesIndex = store.createIndex("by_appearance", "appearance");
            }
            if (!db.objectStoreNames.contains('lessonsdb')) {
                var lessonStore = db.createObjectStore("lessonsdb", {keyPath: "title"});
            }
            if (!db.objectStoreNames.contains('settings')) {
                var settingsStore = db.createObjectStore("settings", {keyPath: "id"});
            }
        };
        request.onerror = function(event) {
            p("Database error: " + event.target.errorCode);
        };
        request.onsuccess = function() {
            db = request.result;
            callback();
        };
    }
}
*/

/*
function initialiseVocabularyFromIndexedDB(callback){
	vocabularyLearning = new Set();
	vocabularyKnown = new Set();
	vocabularyUnknown = new Set();
	var objectStore = db.transaction(["wordsdb"]).objectStore("wordsdb");
	var request = objectStore.getAll();
	request.onerror = function(event) {
	    alert("Unable to retrieve data from database!");
	};
	request.onsuccess = function(event) {  
	    if(request.result) {
			var req = request.result;
			for(var i=0;i<req.length;i++)
			{
				var w = req[i].word;
				var a = req[i].appearances;
				var remainder = a%3;
							
					if(remainder==0){
						vocabularyUnknown.add(w);
					}
					else if(remainder==1){
						vocabularyLearning.add(w);
					}
					else{
						vocabularyKnown.add(w);
					}
			}
			callback(); // callback after data has been processed
		}
	}
}
*/

function initialiseVocabularyFromIndexedDB(){
    return new Promise((resolve, reject) => {
		p("Loading vocabulary from Indexed DB");
        var objectStore = db.transaction(["wordsdb"]).objectStore("wordsdb");
        var request = objectStore.getAll();
        request.onerror = function(event) {
            reject("Unable to retrieve data from database!");
        };
        request.onsuccess = function(event) {  
            if(request.result) {
                var req = request.result;
                for(var i=0;i<req.length;i++)
                {
                    var w = req[i].word;
                    var a = req[i].level;
                    //var remainder = a%3;

                    //if(remainder==0){
                    //    vocabularyUnknown.add(w);
                    //}
                    //else
					if(a=="learning"){
                        vocabularyLearning.add(w);
                    }
                    else{
                        vocabularyKnown.add(w);
                    }
                }
                resolve(); // resolve the promise after data has been processed
            }
        }
    });
}

function initialiseVocabulary(){
    return new Promise((resolve, reject) => {
        if(signedInState=="offline"||signedInState=="signedOut"){
            initialiseVocabularyFromIndexedDB().then(resolve).catch(reject);
        }
        else{
            initialiseVocabularyFromFireDB().then(resolve).catch(reject);
        }
    });
}

function createFireDBDocument(collection, type, lang, uid, w) {
    p("creating document "+type);
    return dbfire.collection(collection).add({
        words: w,
        language: lang,
        type: type,
        author_uid: uid
    }, { merge: true });
}

/*function loadVocabularyFromFireDB(type, lang, uid) {
    return dbfire.collection("vocabulary")
        .where("author_uid", "==", uid)
        .where("type", "==", type)
        .where("language", "==", lang)
        .get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                switch(type) {
                    case "known":
                        doc.data().words.forEach(word => vocabularyKnown.add(word));
                        break;
                    case "learning":
                        doc.data().words.forEach(word => vocabularyLearning.add(word));
                        break;
                    case "unknown":
                        doc.data().words.forEach(word => vocabularyUnknown.add(word));
                        break;
                }
            });
            if(querySnapshot.empty) {
                return createFireDBDocument("vocabulary", type, lang, uid, []);
            }
        });
}*/


/*
function loadVocabularyFromFireDB(lang, uid) {
    let docRef = dbfire.collection('vocabulary')
        .where("author_uid", "==", uid)
        .where("language", "==", lang)
		.where("type", "==", "vocab_v2")
        .limit(1);

    docRef.get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                let docData = doc.data();
                docData.known.forEach(word => vocabularyKnown.add(word));
                docData.learning.forEach(word => vocabularyLearning.add(word));
                docData.unknown.forEach(word => vocabularyUnknown.add(word));
            });
        });
}

function initialiseVocabularyFromFireDB() {
    p("Loading vocabulary from Fire DB");
	let user = firebase.auth().currentUser;
    return Promise.all([
        loadVocabularyFromFireDB("known", lessonLanguage, user.uid),
        loadVocabularyFromFireDB("learning", lessonLanguage, user.uid),
        loadVocabularyFromFireDB("unknown", lessonLanguage, user.uid)
    ]);
}
*/

function loadVocabularyFromFireDB(lang, uid) {
    return new Promise((resolve, reject) => {
        let docRef = dbfire.collection('vocabulary')
            .where("author_uid", "==", uid)
            .where("language", "==", lang)
            .where("type", "==", "vocab_v2")
            .limit(1);
    
        docRef.get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.known.forEach(word => vocabularyKnown.add(word));
                    docData.learning.forEach(word => vocabularyLearning.add(word));
                    //docData.unknown.forEach(word => vocabularyUnknown.add(word));
                });
                resolve();
            })
            .catch((error) => {
                console.log("Error getting document:", error);
                reject(error);
            });
    });
}

function initialiseVocabularyFromFireDB() {
    p("Loading vocabulary from Fire DB");
    let user = firebase.auth().currentUser;
    return Promise.all([
        //checkAndMigrateData(lessonLanguage, user.uid),
        loadVocabularyFromFireDB(lessonLanguage, user.uid)
    ]).catch((error) => {
        console.log("Error initializing vocabulary:", error);
    });
}





/*
function initialiseVocabulary(callback){
	if(signedInState=="offline"||signedInState=="signedOut"){
		initialiseVocabularyFromIndexedDB(callback);
	}
	else{
		//TODO instead of this, use the firedb
		initialiseVocabularyFromIndexedDB(callback);
	}
}
*/

function initialiseLessonText(w) {
    lessonTotalWordCount = 0;
	lessonUniqueWordCount = 0;
    let wordCountObj = w.reduce((acc, word) => {
        acc[word] = acc[word] ? acc[word] + 1 : 1;
        return acc;
    }, {});

    lessonWordArray = Object.entries(wordCountObj).map(([word, count]) => {
        lessonTotalWordCount += count;
        let level = "unknown";
        let initialLevel = "unknown";
        if (vocabularyLearning.has(word)) {
            level = "learning";
            initialLevel = "learning";
        } else if (vocabularyKnown.has(word)) {
            level = "known";
            initialLevel = "known";
        }
        return {word, count, level, initialLevel};
    });

    // calculate the number of unique words
    lessonUniqueWordCount = lessonWordArray.length;
}

function saveVocabulary(){
	
	let wordsToSave=[];
	let wordsToDelete=[];
	let wordsToUpdate = lessonWordArray.filter(wordObj => wordObj.level !== wordObj.initialLevel);
    wordsToUpdate.forEach(wordObj => {
		
		
		let wordText = wordObj.word;
		let level = wordObj.level;
		wordObj.initialLevel = level;
		
		//p("wordObj.level "+wordObj.level);
	//p("wordObj.initialLevel "+wordObj.initialLevel);
	
		p("Updating word: "+wordText);
		switch(level){
			case "known":
				wordsToSave.push({ word: wordText, level: "known" });
				break;
			case "learning":
				wordsToSave.push({ word: wordText, level: "learning" });
				break;
			case "unknown":
				wordsToSave.push({ word: wordText, level: "unknown" });
				break;
			default: console.error("Word "+wordText+" has an invalid level.");
		}		
    });
	
	
	
	if(signedInState=="offline"||signedInState=="signedOut"){
		putVocabularyIntoIndexedDB(wordsToSave);
		//deleteVocabularyFromIndexedDB(wordsToDelete);
	}
	else{
		let user = firebase.auth().currentUser;
		putVocabularyIntoFireDB(wordsToSave, lessonLanguage, user.uid);
		//deleteVocabularyFromFireDB(wordsToDelete, lessonLanguage, user.uid);
	}
	
}


function putVocabularyIntoFireDB(wordsToSave, lang, uid) {
    let newWords = {
        "learning": [],
        "known": [],
        "unknown": []	
    };

    wordsToSave.forEach((wordObj) => {
        newWords[wordObj.level].push(wordObj.word);
    });

    let docRef = dbfire.collection('vocabulary')
        .where("author_uid", "==", uid)
        .where("language", "==", lang)
        .where("type", "==", "vocab_v2")
        .limit(1);

    docRef.get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                let doc = querySnapshot.docs[0];
                let updateObject = {};
                Object.keys(newWords).forEach(wordType => {
                    if (newWords[wordType].length > 0) {
                        // Remove words from "known" and "learning" if it is marked as "unknown"
                        if (wordType === "unknown") {
                            updateObject["known"] = firebase.firestore.FieldValue.arrayRemove(...newWords[wordType]);
                            updateObject["learning"] = firebase.firestore.FieldValue.arrayRemove(...newWords[wordType]);
                        } else {
                            updateObject[wordType] = firebase.firestore.FieldValue.arrayUnion(...newWords[wordType]);
                        }
                    }
                });

                dbfire.collection('vocabulary').doc(doc.id).set(updateObject, { merge: true })
                    .catch((error) => console.error(`Error updating vocabulary in Fire DB:`, error));
            } else {
                let updateObject = {
                    author_uid: uid,
                    language: lang,
                    type: "vocab_v2"
                };
                Object.keys(newWords).forEach(wordType => {
                    updateObject[wordType] = newWords[wordType];
                });

                dbfire.collection('vocabulary').add(updateObject)
                    .catch((error) => console.error(`Error adding vocabulary in Fire DB:`, error));
            }
        })
        .catch((error) => console.error(`Error retrieving vocabulary document:`, error));
    vocabularySaveInProgress = false;
}



function putVocabularyIntoIndexedDB(wordsToSave) {
    let newWords = {
        "learning": [],
        "known": [],
        "unknown": []
    };

    wordsToSave.forEach((wordObj) => {
        newWords[wordObj.level].push(wordObj.word);
    });

    const transaction = db.transaction(["wordsdb"], "readwrite");
    const objectStore = transaction.objectStore("wordsdb");

    wordsToSave.forEach((record) => {
        if(record.level === 'unknown') {
            // If the level is 'known', delete the record instead of adding it.
            const deleteRequest = objectStore.delete(record.word);
            deleteRequest.onsuccess = function(event) {
                console.log(`Word: ${record.word} successfully deleted!`);
            };
            deleteRequest.onerror = function(event) {
                console.error("Error removing word: ", event.target.errorCode);
            };
        } else {
            const putRequest = objectStore.put(record);
            putRequest.onerror = function(event) {
                console.error("Error adding record: ", record, event);
            };
        }
    });

    transaction.oncomplete = function() {
        vocabularySaveInProgress = false;
        console.log("All operations completed successfully!");
    };

    transaction.onerror = function() {
        console.error("Error occurred when performing operations:", transaction.error);
    };
}



function getCustomLessonFromIndexedDB(i, callback) {
    var transaction = db.transaction(["lessonsdb"]);
    var objectStore = transaction.objectStore("lessonsdb");
    var request = objectStore.get(i);

    request.onerror = function(event) {
        alert("Unable to retrieve data from database!");
    };

    request.onsuccess = function(event) {  
        if(request.result) {
            callback(request.result);
        } else {
            console.log("No data record found for the title: " + i);
        }
    };
}





function saveCustomLessonToIndexedDB(lesson) {
    var transaction = db.transaction(["lessonsdb"], "readwrite");
    var objectStore = transaction.objectStore("lessonsdb");
    var request = objectStore.put(lesson);

    request.onerror = function(event) {
        alert("Unable to save data to database!");
    };

    request.onsuccess = function(event) {  
        console.log("Lesson saved successfully with the title: " + lesson.title);
    };
}


/*
function saveCustomLesson(){
	if(signedInState=="offline"||signedInState=="signedOut"){
		saveCustomLessonInIndexedDB();
	}
	else{
		//TODO instead of this, use the firedb
		saveCustomLessonInIndexedDB();
	}
}
*/

function getLastOpenedLessonID(callback) {
    var transaction = db.transaction(["settings"], "readonly");
    var store = transaction.objectStore("settings");
    var request = store.get('lastOpenedLesson');

    request.onerror = function(event) {
        console.log("Error retrieving last opened lesson ID: ", event.target.error);
    };

    request.onsuccess = function(event) {  
        if(request.result) {
            callback(request.result.lessonID);
        } else {
            p("No last opened lesson ID found!");
			window.location.href = 'content.html';
        }
    };
}

function saveLastOpenedLessonID() {
    var transaction = db.transaction(["settings"], "readwrite");
    var store = transaction.objectStore("settings");
    var request = store.put({id: 'lastOpenedLesson', lessonID: lessonID});

    request.onerror = function(event) {
        console.log("Error saving last opened lesson ID: ", event.target.error);
    };

    request.onsuccess = function(event) {  
        console.log("Last opened lesson ID saved successfully!");
    };
}

function handleDictionaryLookup(){
	if(sidebarTab === "dictionary"){
		if(pendingDictionaryLookup!=""){
			document.querySelector('#dictionary-iframe').src = "https://"+naverDictionaryLanguage+".dict.naver.com/#/mini/search?query="+pendingDictionaryLookup;
		}
	}
}

/*
function fillWordlistTable() {
    // Get the DataTable instance
    var table = $('#wordlistTable').DataTable();

    // Clear any existing data
    table.clear();

    // Prepare the data for table
    lessonWordArray.forEach(function(item) {
        // Calculate ratio and frequency
        var ratio = 100*item.count / lessonTotalWordCount;
		
        // Add the data to the table
		
        table.row.add({
            "Count": item.count,
            "Ratio": ratio.toFixed(2)+"%", // Show ratio with 2 decimal points
            "Word": item.word,
            "Level": item.level,
            "Frequency": 1
        });
		
    });

    // Redraw the table
    table.draw();
}
*/

function fillWordlistTable() {
    // Get the DataTable instance
    var wordlistTable = $('#wordlistTable').DataTable();

    // Clear any existing data
    wordlistTable.clear();

    // Prepare the data for tables
    uniqueCounts = { unknown: 0, learning: 0, known: 0 };
    totalCounts = { unknown: 0, learning: 0, known: 0 };

    lessonWordArray.forEach(function(item) {
        // Calculate ratio
        var ratio = 100 * item.count / lessonTotalWordCount;

        // Increase the counts
        uniqueCounts[item.level]++;
        totalCounts[item.level] += item.count;

        // Add the data to the wordlistTable
        wordlistTable.row.add({
            "Count": item.count,
            "Ratio": ratio.toFixed(2) + "%", // Show ratio with 2 decimal points
            "Word": item.word,
            "Level": item.level,
            "Frequency": 1
        });
    });

    // Add the data to the uniqueWordsTable and totalWordsTable
    var uniqueWordsHtml = `
        <tr>
            <td>${uniqueCounts.unknown} (${(100 * uniqueCounts.unknown / lessonUniqueWordCount).toFixed(2)}%)</td>
            <td>${uniqueCounts.learning} (${(100 * uniqueCounts.learning / lessonUniqueWordCount).toFixed(2)}%)</td>
            <td>${uniqueCounts.known} (${(100 * uniqueCounts.known / lessonUniqueWordCount).toFixed(2)}%)</td>
            <td>${lessonUniqueWordCount}</td>
        </tr>
    `;
    var totalWordsHtml = `
        <tr>
            <td>${totalCounts.unknown} (${(100 * totalCounts.unknown / lessonTotalWordCount).toFixed(2)}%)</td>
            <td>${totalCounts.learning} (${(100 * totalCounts.learning / lessonTotalWordCount).toFixed(2)}%)</td>
            <td>${totalCounts.known} (${(100 * totalCounts.known / lessonTotalWordCount).toFixed(2)}%)</td>
            <td>${lessonTotalWordCount}</td>
        </tr>
    `;
    $("#uniqueWordsTable tbody").html(uniqueWordsHtml);
    $("#totalWordsTable tbody").html(totalWordsHtml);

    // Redraw the table
    wordlistTable.draw();
}



function fillSentencelistTable() {
    // Get the DataTable instance
    var sentencelistTable = $('#sentencelistTable').DataTable();

    // Clear any existing data
    sentencelistTable.clear();

    sentences.forEach(function(item, index) {
    let questionCount = 0;
    item.clickableWords.forEach(function(word) {
        const matchingWord = lessonWordArray.find(function(lessonWord) {
            return lessonWord.word === word;
        });
        if (matchingWord && matchingWord.level !== "known") {
            questionCount++;
        }
    });

    // Add the data to the sentencelistTable
    sentencelistTable.row.add({
        "#": item.validSentenceIndex,
        "Sentence": item.sentence,
        "n": item.clickableWords.length,
        "?": questionCount,
        "%": 1
    });
});

    // Redraw the table
    sentencelistTable.draw();

    // Add a click event listener to the table rows
	$('#sentencelistTable').on('click', 'tr', function() {
		var rowData = sentencelistTable.row(this).data();
		var thisSentence = sentences.find(item => item.validSentenceIndex === rowData["#"]);
		jumpToSentence(thisSentence);
	});

}







function updateWordInTable(word, newLevel, oldLevel) {
    // Get the DataTable instance
    var table = $('#wordlistTable').DataTable();
    var count = 0;

    // Iterate over each row in the table
    table.rows().every(function(rowIdx, tableLoop, rowLoop) {
        var data = this.data();

        // If this row's Word matches the specified word
        if (data.Word == word) {
            // Update the Level of this row
            data.Level = newLevel;
            count = data.Count;

            // Invalidate the data for this row to ensure DataTables
            // knows the data has changed and the row should be re-drawn
            this.invalidate();
        }
    });

    // Update global counts
    uniqueCounts[oldLevel]--;
    uniqueCounts[newLevel]++;
    totalCounts[oldLevel] -= count;
    totalCounts[newLevel] += count;

    // Redraw the summary tables
    var uniqueWordsHtml = `
        <tr>
            <td>${uniqueCounts.unknown} (${(100 * uniqueCounts.unknown / lessonUniqueWordCount).toFixed(2)}%)</td>
            <td>${uniqueCounts.learning} (${(100 * uniqueCounts.learning / lessonUniqueWordCount).toFixed(2)}%)</td>
            <td>${uniqueCounts.known} (${(100 * uniqueCounts.known / lessonUniqueWordCount).toFixed(2)}%)</td>
            <td>${lessonUniqueWordCount}</td>
        </tr>
    `;
    var totalWordsHtml = `
        <tr>
            <td>${totalCounts.unknown} (${(100 * totalCounts.unknown / lessonTotalWordCount).toFixed(2)}%)</td>
            <td>${totalCounts.learning} (${(100 * totalCounts.learning / lessonTotalWordCount).toFixed(2)}%)</td>
            <td>${totalCounts.known} (${(100 * totalCounts.known / lessonTotalWordCount).toFixed(2)}%)</td>
            <td>${lessonTotalWordCount}</td>
        </tr>
    `;
    $("#uniqueWordsTable tbody").html(uniqueWordsHtml);
    $("#totalWordsTable tbody").html(totalWordsHtml);

    // Redraw the table to reflect the changes
    table.draw();
}




function initialiseDataTables(){
	$.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {
			if (settings.nTable.id !== 'wordlistTable') {
            // if this is not the wordlistTable, don't filter the data
            return true;
        }
            var unknown = document.getElementById("unknownRadioButton").checked;
            var learning = document.getElementById("learningRadioButton").checked;
            var known = document.getElementById("knownRadioButton").checked;
            
            var level = data[3]; // Get level from the data (4th column, 0-indexed)

            // Check the condition based on the level
            if ((unknown && level == "unknown") || 
                (learning && level == "learning") || 
                (known && level == "known")) {
                return true;
            }
            return false;
        }
    );
	
	
    var table;
    if (!$.fn.DataTable.isDataTable('#wordlistTable')) {
        // if table does not exist, initialize it with empty data
        table = $('#wordlistTable').DataTable({
			paging: true,
			scrollCollapse: false,
			deferRender: true,
			iDisplayLength: 25,
			info: false,
			order: [[ 0, "desc" ]],
			select: 'single',
            scrollX: false,
            columns: [
                { data: "Count" },
                { data: "Ratio" },
                { data: "Word"},
                { data: "Level" },
                { data: "Frequency" }
            ]

        });
    } else {
        // if table already exists, clear it
        table = $('#wordlistTable').DataTable();
        table.clear();
    }
	
	// Add a click event listener to the table
	$('#wordlistTable').on('click', 'tr', function() {
		// Get the DataTable instance
		var table = $('#wordlistTable').DataTable();

		// Get the data for the clicked row
		var data = table.row(this).data();

		// Get the word from the data
		var word = data.Word;
		
		jumpToWord(word);
	});

	
    
    table.draw();
	
		// Event listener to the checkboxes, redraw on click
    $("input[name='status']").on("click", function () {
        table.draw();
    });
	
	//TODO get default from settings
	document.getElementById('unknownRadioButton').checked = true;
    document.getElementById('learningRadioButton').checked = true;
	document.getElementById('knownRadioButton').checked = false;
	
	
	
	var table2;
	if (!$.fn.DataTable.isDataTable('#sentencelistTable')) {
        // if table does not exist, initialize it with empty data
        table2 = $('#sentencelistTable').DataTable({
			paging: true,
			scrollCollapse: false,
			deferRender: true,
			iDisplayLength: 25,
			info: false,
			order: [[ 0, "asc" ]],
			select: 'single',
            scrollX: false,
            columns: [
                { data: "#" },
                { data: "Sentence" },
                { data: "n"},
                { data: "?" },
                { data: "%" }
            ]
        });
    } else {
        // if table already exists, clear it
        table2 = $('#sentencelistTable').DataTable();
        table2.clear();
    }




	
    
    table2.draw();
	
}


function jumpToSentence(sentenceObject) {
    p("Jumping to sentence:", sentenceObject.sentence);
	
    // Get all word elements of the sentence
    var wordElements = $("#learnText .page .clickable-word[data-sentence='" + sentenceObject.sentenceIndex + "'], #learnText .page .non-text[data-sentence='" + sentenceObject.sentenceIndex + "']");


    // If no matching elements, return
    if (wordElements.length === 0) {
        return;
    }
	
	currentJumpWord = sentenceObject.sentence;
	
    // Remove highlight from all elements
    $(".jump").removeClass("jump");

    // Scroll to the first word element
    var firstWordElement = $(wordElements[0]);
    $('#nav-learn').animate({
        scrollTop: $('#nav-learn').scrollTop() + firstWordElement.position().top 
                   - $('#nav-learn').height() / 2 + firstWordElement.height() / 2
    }, 100);

    // Highlight all word elements
    wordElements.addClass("jump");
}







function jumpToWord(word) {
    p("Jumping to " + word);
	
    // Get all .clickable-word elements that contain the word
    var wordElements = $("#learnText .page .clickable-word:contains('" + word + "')");

    // If no matching elements, return
    if (wordElements.length === 0) {
        return;
    }

    // If it's a new word, reset the currentIndex
    if (currentJumpWord !== word) {
        currentJumpIndex = 0;
        currentJumpWord = word;
    }

    // Remove highlight from all elements
    $(".jump").removeClass("jump");

    // Get the current element
    var currentElement = $(wordElements[currentJumpIndex]);

    // Scroll to the current element
    $('#nav-learn').animate({
    scrollTop: $('#nav-learn').scrollTop() + currentElement.position().top 
               - $('#nav-learn').height() / 2 + currentElement.height() / 2
}, 100);

    // Highlight the current element
    currentElement.addClass("jump");

    // Increase currentIndex by 1 for the next call
    currentJumpIndex = (currentJumpIndex + 1) % wordElements.length;
}

function resetJump(){
	$(".jump").removeClass("jump");
	currentJumpIndex = 0;
    currentJumpWord = "";
}








