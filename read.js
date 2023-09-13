var isDebugMode = true;
var lessonLanguage;
var dbfire;
const wordsPerPage = 100;
const pagesToLookAheadBehind = 2;
var scrollLearnTabDebounceTimer = null;
//var scrollEditTabDebounceTimer = null;
const scrollLearnTabDebounceTimeout = 40;
//const scrollEditTabDebounceTimeout = 40;
const colouriseTimeout = 5;
const saveVocabularyTimeout = 2000;
const saveTextTimeout = 2000;
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
var lessonTitle;
var saveTextTimer = null;
var saveVocabularyTimer = null;
var colourisePageTimeout = null;
var currentDictionaryLanguage;
var sidebarTab;
var pendingDictionaryLookup ="";
var currentJumpIndex = 0;  // to track current highlighted word
var currentJumpWord = "";  // to track current word
var lessonUniqueWordCount;
var totalCounts;
var uniqueCounts;
var sentences;
var enableVoice;
var voiceSelect;
var voices;
var initialisationComplete = false;
var voiceSelection;
var settingsDebounceTimeout;
var lastScroll;
var learnMode;
var validChineseWords;
const DEFAULT_LESSON_LANGUAGE="korean";
const DEFAULT_LESSON_TITLE="Custom Lesson";
const DEFAULT_JUMP_HIGHLIGHT='#5a96e0';
const DEFAULT_UNKNOWN_HIGHLIGHT='#F5A9E1';
const DEFAULT_KNOWN_HIGHLIGHT='#99FF00';
const DEFAULT_LEARNING_HIGHLIGHT='#FFFF66';
const DEFAULT_DICTIONARY_LANGUAGE_ENGLISH = "ko";
const DEFAULT_DICTIONARY_LANGUAGE_KOREAN = "en";
const DEFAULT_DICTIONARY_LANGUAGE_CHINESE = "en";
const DEFAULT_DICTIONARY_URL_ENGLISH = "https://korean.dict.naver.com/koendict/#/main";
const DEFAULT_DICTIONARY_URL_KOREAN = "https://korean.dict.naver.com/koendict/#/main";
const DEFAULT_DICTIONARY_URL_CHINESE = "https://www.youdao.com/";
const DEFAULT_FONT="Arial";
var trie;


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
	lessonLanguage = "";
	lessonID="";
	lessonTitle="";
	currentDictionaryLanguage="";
	vocabularyLearning = new Set();
    vocabularyKnown = new Set();
	document.querySelector('#dictionary-iframe').src = '';
	pendingDictionaryLookup ="";
	enableVoice = false;
	voiceSelect = document.querySelector('#voice-selection');
	voices = [];
	initialisationComplete = false;
	voiceSelection="";
	lastScroll=0;
	learnMode="learn";
	

	
	resetJump();

    //vocabularyUnknown = new Set();
	if (saveTextTimer !== null) {
        clearTimeout(saveTextTimer);
    }
	if (scrollLearnTabDebounceTimer !== null) {
            clearTimeout(scrollLearnTabDebounceTimer);
    }
//	if (scrollEditTabDebounceTimer !== null) {
 //           clearTimeout(scrollEditTabDebounceTimer);
 //   }
	if (saveVocabularyTimer !== null) {
            clearTimeout(saveVocabularyTimer);
    }
	if (colourisePageTimeout !== null) {
            clearTimeout(colourisePageTimeout);
    }
	
	//initialiseIndexedDB().then(() => {
		//return initialiseLesson();
	//})
	initialiseIndexedDB().then(() => {
		initialiseTextSaving();
		initialiseDataTables();
		return initialiseUI();
	}).then(() => {
		return initialiseSettings();
	}).then(() => {
		return initialiseVocabulary();
	}).then(() => {
		return initialiseLearnMode();
	}).then(() => {
		return initialiseScroll().then(() => {
			initialiseShortcuts();
		document.getElementById('loading-overlay').style.display = 'none';
		initialisationComplete = true;
		p("Initialisation complete");
		
		// Get a reference to the #nav-learn element
		let navLearnElement = document.getElementById('nav-learn');

		// Create a new Event object for a scroll event
		let scrollEvent = new Event('scroll');

		// Trigger the scroll event on the #nav-learn element
		navLearnElement.dispatchEvent(scrollEvent);

		
		updateAndSaveSettings();
	});
		
	}).catch((error) => {
		console.error("An error occurred:", error);
	});
}

function initialiseShortcuts(){
	$(document).keydown(function(event) {
		if (event.ctrlKey && event.key === 'i') {
			window.open("https://www.google.com/search?q="+pendingDictionaryLookup+"&sxsrf=ALeKk01CGhV9YShWwU3Knh1qjMdDQcYXHQ:1602295138342&source=lnms&tbm=isch&sa=X&ved=2ahUKEwiS_K7E9qjsAhXhlEsFHS36BooQ_AUoAXoECA8QAw&cshid=1602295160675088&biw=1920&bih=937", '_blank');
		}
	});

}

function initialiseScroll() {
    return new Promise((resolve, reject) => {
        var lastScrollArray = settings.lastScrollArray;
        if (lastScrollArray) {
            var matchingItem = lastScrollArray.find(item => item.id == lessonID);
            if (matchingItem) {
                // If a matching item is found, call the function with its scroll as a parameter
                scrollTo(matchingItem.scroll);
                resolve(); // Resolve the promise when finished
            } else {
                resolve(); // Resolve the promise if there's no matching item
            }
        } else {
            resolve(); // Resolve the promise if lastScrollArray is not defined
        }
    });
}


function initialiseLearnMode(){
	if(document.getElementById('learnText').innerText == ''){
		// If activateEditTab is async function then return its promise
		// else wrap it in a Promise.resolve
		return Promise.resolve(activateEditMode());
	} else {
		return Promise.resolve(loadLastLearnMode());
	}
}

function loadLastLearnMode() {
    // Return the Promise returned by getSettings
    return getSettings().then((settings) => {
        var mode = settings.lastOpenedLearnMode;
		if(!mode){
			activateLearnMode();
		}
		else{
			switch(mode) {
				case "edit": 
					activateEditMode(); 
					break;
				case "learn": 
					activateLearnMode(); 
					break;
				default:
					activateLearnMode(); 
			}
		}
    }).catch((error) => {
        console.log("Error occurred: ", error);
    }); 
}



function initialiseLesson() {
    return new Promise((resolve, reject) => {
        lessonID = sessionStorage.getItem('lessonID');
        if (lessonID) {
            //saveLastOpenedLessonID();
            resolve(loadLesson()); // resolve with the promise returned by loadLesson()
        } else {
			lessonID = settings.lastOpenedLesson;
            // Get the lastOpenedLesson from settings
            //var lastOpenedLessonID = window.settings['lastOpenedLesson'];
            if (lessonID) {
                p("Found lesson: "+lessonID);
                //saveLastOpenedLessonID();
                resolve(loadLesson()); // resolve with the promise returned by loadLesson()
            } else {
				window.location.href = 'content.html';
                reject('No last opened lesson ID found');
            }
        }
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
        if(lessonSavingEnabled) {

            let learnTextDiv = document.getElementById('learnText');
			/*
            // Clone the original div
            let clone = learnTextDiv.cloneNode(true);

            let spans = clone.getElementsByTagName('span');

            // Create a copy of the clone's innerHTML
            let newHTML = clone.innerHTML;

            // Loop through the selected elements
            for (let i = 0; i < spans.length; i++) {
                // Replace each span in the copy of the clone's innerHTML with its own text content
                newHTML = newHTML.replace(spans[i].outerHTML, spans[i].textContent);
            }

            // Update the innerHTML of the clone
            clone.innerHTML = newHTML;
			*/
			
            var lesson = {
                id: lessonID,
				title: lessonTitle,
				language: lessonLanguage,
                text: learnTextDiv.innerText
            };

            saveCustomLessonToIndexedDB(lesson);

            console.log("lesson saved");
        }
        saveTextTimer = null;
    }, saveTextTimeout);
}



function initialiseTextSaving(){
	$(function() {
		$('#learnText').on('input paste', onTextareaInput);
	});

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
	
	
	
    if (scrollLearnTabDebounceTimer !== null) {
            clearTimeout(scrollLearnTabDebounceTimer);
        }
		
		scrollLearnTabDebounceTimer = setTimeout(() => {
			
			if(learnMode=="learn")
			{
		
				//console.log("nav-learn Scroll Top Position:", e.target.scrollTop);
				let visibleSpans = findVisibleSpans();
				setActiveText(visibleSpans.firstVisible,visibleSpans.lastVisible);
				if (!colouriseInProgress) {
						colouriseInProgress = true;
						colourisePage();
				}
			}
			updateAndSaveSettings();
			
		}, scrollLearnTabDebounceTimeout);
}

/*
function onNavEditScroll(e) {
    if (scrollEditTabDebounceTimer !== null) {
            clearTimeout(scrollEditTabDebounceTimer);
        }
		scrollEditTabDebounceTimer = setTimeout(() => {
			updateAndSaveSettings();
		}, scrollEditTabDebounceTimeout);
		
}
*/

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

function onClearTextButtonClick() {
    var result = confirm('Are you sure you want to clear the text?');
    
    if (result) {
        document.getElementById('learnText').innerText = '';
        activateEditMode();
    }
}





function onSentencesTabButtonClick() {
	toggleSidebarTab('sentences');
    sidebarTab = "sentences";
	p("Sentences tab clicked.");
}

function onDictionaryTabButtonClick() {
	toggleSidebarTab('dictionary');
    sidebarTab = "dictionary";
	handleDictionaryLookup();
	p("Dictionary tab clicked.");
}

function onWordlistTabButtonClick() {
	toggleSidebarTab('wordlist');
    sidebarTab = "wordlist";
	p("Wordlist tab clicked.");
}

function toggleSidebarTab(tab){
	p("Toggle sidebar tab.");
    var textareaContainer = document.querySelector('.textarea-container');
	var sidebarContainer = document.querySelector('.sidebar-container');
	
    if(sidebarTab == tab) {	
        if(sidebarContainer.classList.contains('hidden')) {
            sidebarContainer.classList.remove('hidden');
            textareaContainer.classList.remove('full-width');
        } else {
            sidebarContainer.classList.add('hidden');
            textareaContainer.classList.add('full-width');
            sidebarContainer.classList.remove('full-width');
        }
    } else {
        // if another tab is selected, make sure the sidebar is visible
        if(sidebarContainer.classList.contains('hidden')) {
            sidebarContainer.classList.remove('hidden');
            textareaContainer.classList.remove('full-width');
        }
    }
	updateAndSaveSettings();
}

function isSidebarVisible() {
    var sidebarContainer = document.querySelector('.sidebar-container');
    
    // The 'hidden' class implies that the sidebar is not visible.
    // So if the sidebarContainer has this class, the function returns false.
    if(sidebarContainer.classList.contains('hidden')) {
        return false;
    } else {
        return true;
    }
}

/*
function isSidebarHidden(){
    var sidebarContainer = document.querySelector('.sidebar-container');
    return sidebarContainer.classList.contains('hidden');
}
*/

function initialiseUI(){
	return new Promise((resolve, reject) => {
		
	$(function() {
		$('#sentences-tab').on('click', onSentencesTabButtonClick);
		$('#wordlist-tab').on('click', onWordlistTabButtonClick);
		$('#dictionary-tab').on('click', onDictionaryTabButtonClick);
		$('#nav-learn').on('scroll', onNavLearnScroll);
		//$('#nav-edit').on('scroll', onNavEditScroll);
		$('#textareaFullscreenButton').on('click', onTextareaFullscreenButtonClick);
		$('#sideBarFullscreenButton').on('click', onSidebarFullscreenButtonClick);
		//$('#nav-learn-tab').on('show.bs.tab', function() {
		//	lastScroll = getCurrentScroll();
		//	onNavLearnTabShowBsTab();
		//});
		//$('#nav-edit-tab').on('show.bs.tab', function() {
		//	lastScroll = getCurrentScroll();
		//	onNavEditTabShowBsTab();
		//});
		$('#clear-text-button').on('click', onClearTextButtonClick);
		$("#toggle-sidebar").click(function() {
			switch(sidebarTab){
				case "sentences":onSentencesTabButtonClick();break;
				case "wordlist":onWordlistTabButtonClick();break;
				case "dictionary":onDictionaryTabButtonClick();break;
			default: console.log("SidebarTab not found.");
			}
		});
		
		  $('#login-button').click(function() {
				onLoginButtonPress();
			});

	
		
		$("#learnText").on("paste", function(e) {
			// prevent the default paste action
			e.preventDefault();

			// get the clipboard data as text
			let text = e.originalEvent.clipboardData.getData("text/plain");

			// replace new line characters with <br> to maintain line breaks
			text = text.replace(/\r?\n/g, '<br>');

			// create a temporary div to hold the pasted HTML
			let tempDiv = document.createElement("div");
			tempDiv.innerHTML = text;

			// get the current selection
			let selection = window.getSelection();
			if (!selection.rangeCount) return false;

			selection.deleteFromDocument();

			// create a document fragment to hold the nodes
			let fragment = document.createDocumentFragment();

			// append all child nodes to the fragment
			while (tempDiv.firstChild) {
				fragment.appendChild(tempDiv.firstChild);
			}

			// insert the fragment at the cursor position
			selection.getRangeAt(0).insertNode(fragment);

			// Clear the selection after pasting
			window.getSelection().removeAllRanges();
		});






		
		
		$(window).on('beforeunload', function(){
			updateAndSaveSettings();
		});

		

		/*
		$('#nav-learn-tab').on('shown.bs.tab', function() {
			scrollTo(lastScroll);
			updateAndSaveSettings();
		});
		$('#nav-edit-tab').on('shown.bs.tab', function() {
			scrollTo(lastScroll);
			updateAndSaveSettings();
		});
		*/
		//$('#nav-learn-tab').on('shown.bs.tab', updateAndSaveSettings);
		//$('#nav-edit-tab').on('shown.bs.tab', updateAndSaveSettings);
		$("#enable-tts-checkbox").on("change", updateAndSaveSettings);
		$("#voice-selection").on("change", updateAndSaveSettings);
		$("#volume-control").on('input', function() {
			var volumeValue = $("#volume-value");
			volumeValue.text(this.value);
			updateAndSaveSettings();
		});
		$("#pitch-control").on('input', function() {
			var pitchValue = $("#pitch-value");
			pitchValue.text(this.value);
			updateAndSaveSettings();
		});
		$("#rate-control").on('input', function() {
			var rateValue = $("#rate-value");
			rateValue.text(this.value);
			updateAndSaveSettings();
		});
	});

	$("#textarea-navbar-title").on("click", function() {
		window.location.href = 'content.html';
	});
	
	$("#textarea-navbar-title").hover(
		function() { // on mouseenter
			$(this).data('originalText', $(this).text());
			$(this).text("Browse Lessons");
		},
		function() { // on mouseleave
			$(this).text($(this).data('originalText'));
		}
	);
	
	$('#browse-lessons-button').click(function() {
		window.location.href = 'content.html';
	});

		
		$('#learnText').on('click', function() {
			resetJump();
		});
		
		$('#learnText').on('contextmenu', function(event) {
			event.preventDefault();
			resetJump();
		});
		
		activateDictionaryTab();
		
		//TTS
		var enableTTSCheckbox = document.querySelector('#enable-tts-checkbox');

		speechSynthesis.voiceschanged = populateVoiceList;
		 
		enableTTSCheckbox.onchange = function() {
			var ttsControls = document.getElementById('tts-controls');
			enableVoice = this.checked;
			if (enableVoice) {
			// Remove the "disabled" class
				ttsControls.classList.remove('tts-controls-disabled');
				populateVoiceList();
			} else {
				// Add the "disabled" class
				ttsControls.classList.add('tts-controls-disabled');
			}
		}

		
	$('#edit-button').on('click', function() {
        toggleEditMode();
    });

		// When the dropdown item is clicked, change the theme
	document.getElementById('light-mode').addEventListener('click', function() {
		setTheme('light');
	});

	document.getElementById('dark-mode').addEventListener('click', function() {
		setTheme('dark');
	});
	
	
	
	$('#character-conversion-dropdown').on('change', function() {
        if(lessonLanguage == "chinese"){
			if(learnMode=="learn"){
				activateLearnMode();
			}
			updateAndSaveSettings();
			
		}	
    });
		
	resolve();
    });
}




// This function populates the voice-selection dropdown with the available voices
function populateVoiceList() {
    //var voiceSelect = document.querySelector('#voice-selection');
	console.log("editing voice");
    // Clear any existing options
    voiceSelect.innerHTML = '';

    // Get the available voices
    voices = speechSynthesis.getVoices();

    // Get the selected language
    var selectedLanguage;
	switch(lessonLanguage){
		case "korean":selectedLanguage="ko";break;
		case "chinese":selectedLanguage="zh";break;
		case "english":selectedLanguage="en";break;
		default:console.log("Language not found");
	}

    // Filter voices to include only voices that start with the selected language
    voices = voices.filter(function(voice) {
        return voice.lang.startsWith(selectedLanguage);
    });
    // Add each voice as an option in the dropdown
    voices.forEach(function(voice, i) {
        var option = document.createElement('option');
        option.value = voice.name;
        option.innerHTML = `${voice.name} (${voice.lang})`;
		
		if (voice.name === voiceSelection) {
            option.selected = true;
        }
        voiceSelect.appendChild(option);
    });
}



window.handleCredentialResponse = (response) => {
	onSignIn(); 
}
	
	function toggleSignIn() {
		if (firebase.auth().currentUser) {
			handleSignOut().then(() => {
				displaySigninElements("signedOutMode");
			}).catch(error => {
				console.error("An error occurred while signing out:", error);
			});
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
			firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
				// If successful, handle signed-in mode.
				p("Signed in with email");
				displaySigninElements("signedInMode");
			}).catch(function(error) {
				var errorCode = error.code;
				var errorMessage = error.message;
				if (errorCode === 'auth/wrong-password') {
					alert('Wrong password.');
				} else {
					alert(errorMessage);
				}
				p(error);
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
		return firebase.auth().signOut().then(() => {
			displaySigninElements("signedOutMode");
		}).catch((error) => {
			console.error("An error occurred while signing out:", error);
		});
	}


function displaySigninElements(state)
{
    const loginButton = document.getElementById('login-button');
    const signinStateText = document.getElementById('signin-state-text');

    switch(state)
    {
        case "offlineMode":
            loginButton.style.display = 'none';
            signinStateText.innerText = "Offline";
            loginButton.innerText = "Sign in";
            break;
        case "signedOutMode":
            loginButton.style.display = '';
            signinStateText.innerText = "Signed out";
            loginButton.innerText = "Sign in";
            break;
        case "signedInMode":
            loginButton.style.display = '';
            signinStateText.innerText = "Signed in";
            loginButton.innerText = "Sign out";
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
    return new Promise((resolve, reject) => {
        p("Loading lesson:", lessonID);
        //if (/^custom\d+$/.test(lessonID)) {
            p("Custom lesson loading...");
            initCustomLesson()
                .then(() => resolve())
                .catch((error) => {
                    console.error('Error:', error);
                    reject(error);
                });
        //}
		/*
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
                initPremadeLesson(lesson.title, lesson.text)
                    .then(() => resolve())
                    .catch((error) => {
                        console.error('Error:', error);
                        reject(error);
                    });
            })
            .catch(error => {
                console.error('Error:', error);
                reject(error);
            });
        }
		*/
    });
}





function activateDictionaryTab(){
	var dictionaryTab = new bootstrap.Tab(document.getElementById('dictionary-tab'));
    dictionaryTab.show();
	onDictionaryTabButtonClick();
  /*  if (!document.getElementById('nav-edit-tab').classList.contains('active')) {
        document.getElementById('nav-edit-tab').classList.add('active');
        document.getElementById('nav-edit').classList.add('show', 'active');

        document.getElementById('nav-learn-tab').classList.remove('active');
        document.getElementById('nav-learn').classList.remove('show', 'active');
    }
	*/
}

/*
function activateEditTab(){
	var editTab = new bootstrap.Tab(document.getElementById('nav-edit-tab'));
    editTab.show();
    if (!document.getElementById('nav-edit-tab').classList.contains('active')) {
        document.getElementById('nav-edit-tab').classList.add('active');
        document.getElementById('nav-edit').classList.add('show', 'active');

        document.getElementById('nav-learn-tab').classList.remove('active');
        document.getElementById('nav-learn').classList.remove('show', 'active');
    }
	
}
*/



/*
function initPremadeLesson(title, text){
    return new Promise((resolve, reject) => {
        document.getElementById('textarea-navbar-title').innerText = title;
        $('#current-lesson-title').text(title);
        lessonSavingEnabled=false;
        const textarea = document.getElementById('editText');
        textarea.innerHTML = text;
        $('#editText').trigger('input');
        resolve();
    });
}
*/

/*function formatTitle(title) {
    // Split the title into words (assuming the format is always "custom1", "custom2", etc.)
    let words = title.split(/(\d+)/);  // This will split the title into ["custom", "1"]

    // Convert the first character of the first word to uppercase
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);

    // Join the words back together with a space in between
    let formattedTitle = words.join(' ');

    return formattedTitle;
}
*/
/*
function extractNumberFromID(id) {
    // Use a regular expression to match the numerical part of the ID
    let match = id.match(/\d+/);

    // If there is a match, the result will be an array where the first element is the numerical part
    // Convert it to a number using parseInt and return it
    if (match) {
        return parseInt(match[0], 10);
    }

    // If there's no match, return undefined or any suitable default value
    return undefined;
}
*/

function initCustomLesson(){
    return new Promise((resolve, reject) => {
       /* var title = formatTitle(lessonID);
		
		
		var idNumber = extractNumberFromID(lessonID);
        
		
		*/
		
		
        lessonSavingEnabled=true;
        
     //   if(signedInState=="offline"||signedInState=="signedOut"){
            getCustomLessonFromIndexedDB(lessonID, function(lesson) {
                if(lesson){
					lessonTitle=lesson.title;
					lessonLanguage=lesson.language;
					
					document.getElementById('textarea-navbar-title').innerText = lessonTitle+" ("+capitalizeFirstLetter(lessonLanguage)+")";
					$('#current-lesson-title').text(lessonTitle+" ("+ capitalizeFirstLetter(lessonLanguage)+")");
					
                    const textarea = document.getElementById('learnText');
                    textarea.innerText = lesson.text;
					
                    resolve();
                } else {
                    console.log('Could not load custom lesson');
                }
            });
     //   }
      /*  else{
            getCustomLessonFromIndexedDB(lessonID, function(lesson) {
                if(lesson){
                    const textarea = document.getElementById('learnText');
                    textarea.innerText = lesson.text;
                   // $('#editText').trigger('input');
                    resolve();
                } else {
                    reject('Could not load custom lesson');
                }
            });
        } */
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}





function loadTextIntoLearnTab(text, language) {
    const learnTextElement = document.getElementById('learnText');
    // Split the text into sentences
    let rawSentences = text.split(/(?<=[.!?。？！\n])/);
    let chunks = [];
	sentences=[];
    let sentenceIndex = 0;
	
    rawSentences.forEach((sentence) => {
		
		if (language === "chinese") {
			sentence = segmentChineseText(sentence, trie);
		}

		
		let sentenceChunks = sentence.split(/(\s|\n)/).flatMap((chunk) => {
			if (/\n/.test(chunk)) {
				return '<br>';
			} else if (/\s/.test(chunk)) {
				return `<span class="non-text" data-sentence="${sentenceIndex}"> </span>`;
			} else {
				let regex;
				switch (language) {
					case "korean":
						regex = /([\uAC00-\uD7AF]+)/g;
						break;
					case "english":
						regex = /([a-zA-Z]+)/g;
						break;
					case "chinese":
						regex = /([\p{Script=Han}]+)/u;
						break;
					default:
						regex = /(\w+)/g;
				}

				// Split the chunk into subChunks based on the regex
				let subChunks = chunk.split(regex);

				return subChunks.map((subChunk) => {
					if ((language == "korean" && /[\uAC00-\uD7AF]/.test(subChunk)) ||
						(language == "english" && /[a-zA-Z]/.test(subChunk)) ||
						(language == "chinese" && /[\p{Script=Han}]/u.test(subChunk))) {
						return `<span class="clickable-word" data-sentence="${sentenceIndex}">${subChunk}</span>`;
					} else {
						return `<span class="non-text" data-sentence="${sentenceIndex}">${subChunk}</span>`;
					}
				});
			}
		});
		//chunks+='<span class="non-text"><br></span>';
        chunks = chunks.concat(sentenceChunks);
		
        sentenceIndex++;
    });
	//chunks.push('<span class="non-text"><br></span>');

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
		$(function() {
			$(word).on('click', onWordClick);
			$(word).on('contextmenu', onWordRightClick);
		});

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

function onWordRightClick(e) {
    e.preventDefault();
	const wordText = this.textContent;
	pendingDictionaryLookup=wordText;
	handleDictionaryLookup();
	playWordTTS(wordText);
	if(isSidebarVisible()){
		if(sidebarTab != "dictionary"){
			activateDictionaryTab();
		}
	}
	else{
		activateDictionaryTab();
		//sidebarTab = "dictionary";
		//toggleSidebarTab(sidebarTab);
	}
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
	//if(currentJumpWord!=""){
	//		if(word==currentJumpWord){
	//			resetJump();
	//			return;
	//		}
	//		else{
	//			resetJump();
	//		}
	//}
	
	if(currentJumpWord!=""){
		resetJump();
		return;
	}
	
	playWordTTS(word);
	const lookupWord = lessonLanguage === "english" ? word.toLowerCase() : word;
	var newLevel = promoteOneLevel(lookupWord); // Pass lookupWord here
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
	updateWordInWordTable(word,newLevel);
	updateWordInSentencesTable(word,newLevel);
}

function promoteOneLevel(word){
	var newLevel="";
	let wordObj = lessonWordArray.find(w => lessonLanguage === "english" ? w.word.toLowerCase() === word : w.word === word);
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
		if (page) {
        page.classList.add('colourised');
        const clickableWords = page.querySelectorAll('span.clickable-word');
        clickableWords.forEach(word => {
            // Get the word's text content
            const wordText = word.textContent;

            // Convert to lowercase if lessonLanguage is "english"
            const lookupWord = lessonLanguage == "english" ? wordText.toLowerCase() : wordText;

            let wordObj = lessonWordArray.find(w => w.word === lookupWord);
            if (!wordObj) {
                console.error("Word " + wordText + " not found in lesson text.");
                return; // Skip this word if not found
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
            var request = indexedDB.open("wordsdb", 10);
            request.onupgradeneeded = function() {
                db = request.result;
                if (!db.objectStoreNames.contains('wordsdb')) {
                    var store = db.createObjectStore("wordsdb", {keyPath: "word"});
                    //var appearancesIndex = store.createIndex("by_appearance", "appearance");
                }
                if (!db.objectStoreNames.contains('lessonsdb')) {
                    var lessonStore = db.createObjectStore("lessonsdb", {keyPath: "id"});
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

/*
function createFireDBDocument(collection, type, lang, uid, w) {
    p("creating document "+type);
    return dbfire.collection(collection).add({
        words: w,
        language: lang,
        type: type,
        author_uid: uid
    }, { merge: true });
}
*/

/*
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
                });
                resolve();
            })
            .catch((error) => {
                console.log("Error getting document:", error);
                reject(error);
            });
    });
}
*/

/*
function loadVocabularyFromFireDB(lang, uid) {
    let loadLearning = new Promise((resolve, reject) => {
        dbfire.collection('vocabulary')
            .where("author_uid", "==", uid)
            .where("language", "==", lang)
            .where("type", "==", "learning")
            .limit(1)
            .get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.words.forEach(word => vocabularyLearning.add(word));
                });
                resolve();
            })
            .catch((error) => {
                console.log("Error getting learning vocabulary:", error);
                reject(error);
            });
    });

    let loadKnown = new Promise((resolve, reject) => {
        dbfire.collection('vocabulary')
            .where("author_uid", "==", uid)
            .where("language", "==", lang)
            .where("type", "==", "known")
            .limit(1)
            .get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.words.forEach(word => vocabularyKnown.add(word));
                });
                resolve();
            })
            .catch((error) => {
                console.log("Error getting known vocabulary:", error);
                reject(error);
            });
    });

    // Return a Promise that resolves when both learning and known vocabularies are loaded
    return Promise.all([loadLearning, loadKnown]);
}
*/


function loadVocabularyFromFireDB(lang, uid) {
    return Promise.all([loadVocabulary("learning", lang, uid), loadVocabulary("known", lang, uid)]);
}

function loadVocabulary(type, lang, uid) {
    return new Promise((resolve, reject) => {
        dbfire.collection('vocabulary')
            .where("author_uid", "==", uid)
            .where("language", "==", lang)
            .where("type", "==", type)
            .limit(1)
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    console.log(`No ${type} vocabulary found! Creating a new one...`);
                    return createVocabularyDocument(type, lang, uid);
                } else {
                    querySnapshot.forEach((doc) => {
                        let docData = doc.data();
                        docData.words.forEach(word => {
                            if (type === "learning") {
                                vocabularyLearning.add(word);
                            } else {
                                vocabularyKnown.add(word);
                            }
                        });
                    });
                    resolve();
                }
            })
            .catch((error) => {
                console.log(`Error getting ${type} vocabulary:`, error);
                reject(error);
            });
    });
}



function printVocabulary() {
    console.log("Known vocabulary:");
    vocabularyKnown.forEach(word => console.log(word));

    console.log("Learning vocabulary:");
    vocabularyLearning.forEach(word => console.log(word));
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

function createVocabularyDocument(type, lang, uid) {
    return dbfire.collection('vocabulary').add({
        author_uid: uid,
        language: lang,
        type: type,
        words: []
    }).then(docRef => {
        console.log(`Document created with ID: ${docRef.id}`);
    }).catch(error => {
        console.error(`Error creating document: ${error}`);
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

    // If lessonLanguage is "english", convert all words to lowercase
    if (lessonLanguage == "english") {
        w = w.map(word => word.toLowerCase());
    }

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
		
		//todo delete
		//checkWordInDB("제공", "learning", firebase.auth().currentUser.uid, lessonLanguage);
		//checkWordInDB("제공", "known", firebase.auth().currentUser.uid, lessonLanguage);
		
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

    const updateWordsInDB = (type) => {
        return new Promise((resolve, reject) => {
            let docRef = dbfire.collection('vocabulary')
                .where("author_uid", "==", uid)
                .where("language", "==", lang)
                .where("type", "==", type)
                .limit(1);

            docRef.get()
                .then((querySnapshot) => {
                    if (!querySnapshot.empty) {
                        let doc = querySnapshot.docs[0];
                        let updateObject = {};

                        // Remove unknown words and words from the opposite category
                        let wordsToRemove = newWords["unknown"].concat(newWords[type === "learning" ? "known" : "learning"]);
                        if (wordsToRemove.length > 0) {
                            updateObject['words'] = firebase.firestore.FieldValue.arrayRemove(...wordsToRemove);
                        }

                        // Add learning or known words
                        if (newWords[type].length > 0) {
                            updateObject['words'] = firebase.firestore.FieldValue.arrayUnion(...newWords[type]);
                        }

                        // Check if we have anything to update
                        if (Object.keys(updateObject).length > 0) {
                            return dbfire.collection('vocabulary').doc(doc.id).update(updateObject);
                        }
                    } else {
                        console.log("No such document!");
                    }
                })
                .then(resolve)
                .catch((error) => {
                    console.error(`Error updating vocabulary in Fire DB:`, error);
                    reject(error);
                });
        });
    };

    Promise.all([updateWordsInDB("learning"), updateWordsInDB("known")]).finally(() => {
        vocabularySaveInProgress = false;
    });
}






/*
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
                            // Remove word from all other arrays before adding
                            Object.keys(newWords).forEach(otherType => {
                                if (otherType !== wordType) {
                                    updateObject[otherType] = firebase.firestore.FieldValue.arrayRemove(...newWords[wordType]);
                                }
                            });
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
                // Remove unknown from newWords
                delete newWords["unknown"];
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
*/


/*

function putVocabularyIntoFireDB(wordsToSave, lang, uid) {
    let newWords = {
        "learning": [],
        "known": [],
        "unknown": []    
    };

    wordsToSave.forEach((wordObj) => {
        newWords[wordObj.level].push(wordObj.word);
    });

    const handleWordList = (type) => {
        return new Promise((resolve, reject) => {
            let docRef = dbfire.collection('vocabulary')
                .where("author_uid", "==", uid)
                .where("language", "==", lang)
                .where("type", "==", type)
                .limit(1);

            docRef.get()
                .then((querySnapshot) => {
                    let doc = querySnapshot.docs[0];
                    let updateObject = {};

                    if (newWords["unknown"].length > 0) {
                        updateObject[type] = firebase.firestore.FieldValue.arrayRemove(...newWords["unknown"]);
                    }

                    if (newWords[type].length > 0) {
                        updateObject[type] = firebase.firestore.FieldValue.arrayUnion(...newWords[type]);
                    }

                    // Remove the added word from the other document (known or learning)
                    let otherType = type === "known" ? "learning" : "known";
                    if (newWords[type].length > 0) {
                        updateObject[otherType] = firebase.firestore.FieldValue.arrayRemove(...newWords[type]);
                    }

                    // Check if we have anything to update
                    if (Object.keys(updateObject).length > 0) {
                        return dbfire.collection('vocabulary').doc(doc.id).set(updateObject, { merge: true });
                    }
                })
                .then(resolve)
                .catch((error) => {
                    console.error(`Error updating vocabulary in Fire DB:`, error);
                    reject(error);
                });
        });
    };

    Promise.all([handleWordList('learning'), handleWordList('known')]).finally(() => {
        vocabularySaveInProgress = false;
    });
}

*/




/*
function checkWordInDB(word, type, uid, lang) {
    return new Promise((resolve, reject) => {
        let docRef = dbfire.collection('vocabulary')
            .where("author_uid", "==", uid)
            .where("language", "==", lang)
            .where("type", "==", type);

        docRef.get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    if (docData[type].includes(word)) {
                        console.log(`Word "${word}" found in ${type}`);
                    } else {
                        console.log(`Word "${word}" not found in ${type}`);
                    }
                });
                resolve();
            })
            .catch((error) => {
                console.log("Error getting document:", error);
                reject(error);
            });
    });
}
*/

function checkWordInDB(word, type, uid, lang) {
    return new Promise((resolve, reject) => {
        let docRef = dbfire.collection('vocabulary')
            .where("author_uid", "==", uid)
            .where("language", "==", lang)
            .where("type", "==", type);

        docRef.get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    if (docData['words'] && docData['words'].includes(word)) {
                        console.log(`Word "${word}" found in ${type}`);
                    } else {
                        console.log(`Word "${word}" not found in ${type}`);
                    }
                });
                resolve();
            })
            .catch((error) => {
                console.log("Error getting document:", error);
                reject(error);
            });
    });
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
    var transaction = db.transaction(["lessonsdb"], "readwrite");
    var objectStore = transaction.objectStore("lessonsdb");
    var request = objectStore.get(i);

    request.onerror = function(event) {
        alert("Unable to retrieve data from database!");
    };

    request.onsuccess = function(event) {
		if(request.result) {
			//console.log("***HERE*** "+request.result.language);
			// Check if the title exists, if not set it to DEFAULT_LESSON_TITLE
			if (typeof request.result.title === 'undefined' || request.result.title === null) {
				request.result.title = DEFAULT_LESSON_TITLE;
			}

			// Check if the language exists, if not set it to DEFAULT_LESSON_LANGUAGE
			if (typeof request.result.language === 'undefined' || request.result.language === null) {
				request.result.language = DEFAULT_LESSON_LANGUAGE;
			}

			callback(request.result);
		} else {
			console.log("No data record found for the title: " + i + ". Creating new record.");

			var newLesson = {
				id: i,
				title: DEFAULT_LESSON_TITLE,
				text: "",
				language: DEFAULT_LESSON_LANGUAGE
			};

			var addRequest = objectStore.add(newLesson);

			addRequest.onerror = function(event) {
				console.log("Failed to create new record: " + event.target.error);
			};

			addRequest.onsuccess = function(event) {
				console.log("New record has been created with id: " + event.target.result);
				callback(newLesson);
			};
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

/*
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
*/

/*
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
*/

function handleDictionaryLookup() {
    if (sidebarTab === "dictionary") {
        if (pendingDictionaryLookup != "") {
            switch (lessonLanguage) {
                case "korean":
                    switch (currentDictionaryLanguage) {
                        case "en":
                        case "zh":
                            document.querySelector('#dictionary-iframe').src = "https://korean.dict.naver.com/ko" + currentDictionaryLanguage + "dict/#/search?query=" + pendingDictionaryLookup;
                            break;
                        case "ja":
                        case "de":
                        case "hi":
                        case "id":
                        case "pt":
                        case "ru":
                        case "es":
                        case "th":
                        case "vi":
                        case "fr":
                        case "it":
                            document.querySelector('#dictionary-iframe').src = "https://dict.naver.com/" + currentDictionaryLanguage + "kodict/#/search?query=" + pendingDictionaryLookup;
                            break;
                        default:
                            console.error("Dictionary language not found " + currentDictionaryLanguage);
                    }
                    break;
                case "english":
					switch (currentDictionaryLanguage) {
							case "zh":
								document.querySelector('#dictionary-iframe').src = "https://dict.youdao.com/result?word="+pendingDictionaryLookup+"&lang=en";
								break;
							case "ko":
								document.querySelector('#dictionary-iframe').src = "https://korean.dict.naver.com/ko" + currentDictionaryLanguage + "dict/#/search?query=" + pendingDictionaryLookup;
								break;
							default:
                            console.error("Dictionary language not found " + currentDictionaryLanguage);
						}
					   // var langCode = convertLangCodeCambridge(currentDictionaryLanguage);
						//var loc = "https://dictionary.cambridge.org/amp/" + langCode + "/" + pendingDictionaryLookup;
						//document.querySelector('#dictionary-iframe').src = loc;
						 
                    break;
					case "english":
					switch (currentDictionaryLanguage) {
							case "zh":
								document.querySelector('#dictionary-iframe').src = "https://dict.youdao.com/result?word="+pendingDictionaryLookup+"&lang=en";
								break;
							case "ko":
								document.querySelector('#dictionary-iframe').src = "https://korean.dict.naver.com/ko" + currentDictionaryLanguage + "dict/#/search?query=" + pendingDictionaryLookup;
								break;
							default:
                            console.error("Dictionary language not found " + currentDictionaryLanguage);
						}
					   // var langCode = convertLangCodeCambridge(currentDictionaryLanguage);
						//var loc = "https://dictionary.cambridge.org/amp/" + langCode + "/" + pendingDictionaryLookup;
						//document.querySelector('#dictionary-iframe').src = loc;
						 
                    break;
					case "chinese":
					switch (currentDictionaryLanguage) {
							case "en":
								document.querySelector('#dictionary-iframe').src = "https://dict.youdao.com/result?word="+pendingDictionaryLookup+"&lang=en";
								break;
							case "ko":
								document.querySelector('#dictionary-iframe').src = "https://korean.dict.naver.com/ko" + currentDictionaryLanguage + "dict/#/search?query=" + pendingDictionaryLookup;
								break;
							default:
                            console.error("Dictionary language not found " + currentDictionaryLanguage);
						}
					   // var langCode = convertLangCodeCambridge(currentDictionaryLanguage);
						//var loc = "https://dictionary.cambridge.org/amp/" + langCode + "/" + pendingDictionaryLookup;
						//document.querySelector('#dictionary-iframe').src = loc;
						 
                    break;
                default:
                    console.error("Lesson language not found " + lessonLanguage);
            }
        }
    }
}

/*
function convertLangCodeCambridge(dictionaryLanguage) {
    var code;
    switch(dictionaryLanguage) {
        case "en": code = "english"; break;
        case "en-learners": code = "learner-english"; break;
        case "fr": code = "english-french"; break;
        case "es": code = "english-spanish"; break;
        case "de": code = "english-german-"; break;
        case "zh-s": code = "english-chinese-simplified"; break;
        case "zh-t": code = "english-chinese-traditional"; break;
        case "id": code = "english-indonesian"; break;
        case "it": code = "english-italian"; break;
        case "ja": code = "english-japanese"; break;
        case "pl": code = "english-polish"; break;
        case "pt": code = "english-portuguese"; break;
        case "ar": code = "english-arabic"; break;
        case "ca": code = "english-catalan"; break;
        case "cs": code = "english-czech"; break;
        case "ko": code = "english-korean"; break;
        case "da": code = "english-danish"; break;
        case "ms": code = "english-malaysian"; break;
        case "no": code = "english-norwegian"; break;
        case "ru": code = "english-russian"; break;
        case "th": code = "english-thai"; break;
        case "tr": code = "english-turkish"; break;
        case "vi": code = "english-vietnamese"; break;
        default: console.error("Language code not found: "+dictionaryLanguage);
    }
    return code;
}
*/

/*
<option value="zh-CN">Chinese (Simplified)</option>
							<option value="zh-TW">Chinese (Traditional)</option>
							<option selected value="en">English</option>
							<option value="fr">French</option>
							<option value="de">German</option>
							<option value="hi">Hindi</option>
							<option value="id">Indonesian</option>
							<option value="it">Italian</option>
							<option value="ja">Japanese</option>
							<option value="pt">Portuguese</option>
							<option value="ru">Russian</option>
							<option value="es">Spanish</option>
							<option value="th">Thai</option>
							<option value="vi">Vietnamese</option>
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
            "Frequency": ""
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
	colourWordTable(wordlistTable);
	//wordlistTable.draw();
	
	$('#wordlistTable').on('draw.dt', function () {
		var tab = $(this).DataTable();
		colourWordTable(tab);
	});
	
}






function fillSentencelistTable() {
    // Get the DataTable instance
    if ($.fn.dataTable.isDataTable('#sentencelistTable')) {
        var sentencelistTable = $('#sentencelistTable').DataTable();
        // Clear any existing data
        sentencelistTable.clear();
    } else {
        // Initialize the DataTable
        var sentencelistTable = $('#sentencelistTable').DataTable();
    }


sentences.forEach(function(item, index) {
	
    let sentenceHtml = item.sentence;
	let sentenceLength = item.clickableWords.length;
	let questionCount=0;
    item.clickableWords.forEach(function(word) {
        const lookupWord = lessonLanguage === "english" ? word.toLowerCase() : word;
        const matchingWord = lessonWordArray.find(function(lessonWord) {
            return lessonLanguage === "english" ? lessonWord.word.toLowerCase() === lookupWord : lessonWord.word === word;
        });
        if (matchingWord) {
            let wordHtml = word;
            if (matchingWord.level === "known") {
                //wordHtml = `<span class="known">${word}</span>`;
            } else if (matchingWord.level === "learning") {
                //wordHtml = `<span class="learning">${word}</span>`;
				questionCount++;
            }
			else{
				//wordHtml = `<span class="unknown">${word}</span>`;
				questionCount++;
			}
            sentenceHtml = sentenceHtml.replace(word, wordHtml);
			
        }
    });
	

	
	let percentKnown = ((1-(questionCount/sentenceLength))*100).toFixed(2)+"%";

    // Add the data to the sentencelistTable
    sentencelistTable.row.add({
        "#": item.validSentenceIndex,
        "Sentence": sentenceHtml,
        "n": sentenceLength,
        "x": questionCount,
        "%": percentKnown
    });
});
	
    // Redraw the table
    sentencelistTable.draw();
	colourSentences(sentencelistTable);


	$('#sentencelistTable').off('draw.dt').on('draw.dt', function () {
        var table = $(this).DataTable();
        colourSentences(table);
    });

    $('#sentencelistTable').off('click', 'tr:not(:first)').on('click', 'tr:not(:first)', function() {
        var rowData = sentencelistTable.row(this).data();
        var thisSentence = sentences.find(item => item.validSentenceIndex === rowData["#"]);
        pendingDictionaryLookup=thisSentence.sentence;
        jumpToSentence(thisSentence);
        playWordTTS(thisSentence.sentence);
    });
	


}


function colourSentences(table) {
  let currentPageRows = table.rows({ page: 'current' });
  currentPageRows.every(function() {
    let rowData = this.data();
    let index = rowData["#"];
    let thisSentence = sentences.find(item => item.validSentenceIndex === index);
    let sentenceHtml = thisSentence.sentence;

    let regex;
    switch (lessonLanguage) {
      case "english":
        regex = /([a-zA-Z]+)/g;
        break;
      case "korean":
        regex = /([\uAC00-\uD7AF]+)/g;
        break;
	case "chinese":
        regex = /([\p{Script=Han}]+)/gu;
        break;
      default:
        regex = /(\w+)/g;
    }

    sentenceHtml = sentenceHtml.replace(regex, function(match) {
      const lookupMatch = lessonLanguage === "english" ? match.toLowerCase() : match;
        let matchingWord = lessonWordArray.find(function(lessonWord) {
            return lessonLanguage === "english" ? lessonWord.word.toLowerCase() === lookupMatch : lessonWord.word === match;
        });

      if (matchingWord) {
        if (matchingWord.level === "known") {
          return `<span class="known">${match}</span>`;
        } else if (matchingWord.level === "learning") {
          return `<span class="learning">${match}</span>`;
        } else {
          return `<span class="unknown">${match}</span>`;
        }
      } else {
        return match;
      }
    });

    // Update the "Sentence" field in the current rowData
    rowData["Sentence"] = sentenceHtml;

    // Update the data for the current row
    this.data(rowData).invalidate();
  });
}




/*
function colourSentences(table){
	
  let currentPageRows = table.rows({ page: 'current' });

	currentPageRows.every(function() {
	  let rowData = this.data();
	  let index = rowData["#"];
	  let thisSentence = sentences.find(item => item.validSentenceIndex === index);
	  let sentenceHtml = thisSentence.sentence;
	
	let delimiters;
		switch (lessonLanguage) {
		  case "english":
			delimiters = '(^|\\s|[^a-zA-Z])';
			break;
		  case "korean":
			delimiters = '(^|\\s|[^\\uAC00-\\uD7AF])';
			break;
		  default:
			delimiters = '(^|\\s|\\W)';
		}
		
		console.log("***HERE*** "+thisSentence.clickableWords);
		console.log("***HERE2*** "+sentenceHtml);
	  
	  thisSentence.clickableWords.forEach(function(word) {
		const matchingWord = lessonWordArray.find(function(lessonWord) {
		  return lessonWord.word === word;
		});

		if (matchingWord) {
		  let wordHtml = word;
		  if (matchingWord.level === "known") {
			wordHtml = `<span class="known">${word}</span>`;
		  } else if (matchingWord.level === "learning") {
			wordHtml = `<span class="learning">${word}</span>`;
		  } else {
			wordHtml = `<span class="unknown">${word}</span>`;
		  }
		  
		 
		 const regex = new RegExp(`${delimiters}${word}${delimiters}`, 'g');
		sentenceHtml = sentenceHtml.replace(regex, `$1${wordHtml}$2`);


		  
		  
		}
	  });

	  // Update the "Sentence" field in the current rowData
	  rowData["Sentence"] = sentenceHtml;

	  // Update the data for the current row
	  this.data(rowData).invalidate();
	});

	// Redraw only the affected rows
	//currentPageRows.draw();
}
*/

function colourWordTable(table) {
    let currentPageRows = table.rows({ page: 'current' });

    currentPageRows.every(function() {
        let rowData = this.data();
		var tempElement = document.createElement('div');
        tempElement.innerHTML = rowData["Word"];

        // Get the text content of the tempElement, which will be the word without any HTML tags
        let word = tempElement.textContent;

        const matchingWord = lessonWordArray.find(function(lessonWord) {
			return lessonLanguage === "english" ? lessonWord.word.toLowerCase() === word.toLowerCase() : lessonWord.word === word;
		});


        if (matchingWord) {
            let wordHtml = word;
            if (matchingWord.level === "known") {
                wordHtml = `<span class="known">${word}</span>`;
            } else if (matchingWord.level === "learning") {
                wordHtml = `<span class="learning">${word}</span>`;
            } else {
                wordHtml = `<span class="unknown">${word}</span>`;
            }
            rowData["Word"] = wordHtml;

            // Update the data and invalidate the row to redraw it
            this.data(rowData).invalidate();
        }
    });
}


function updateWordInSentencesTable(word, newLevel){
	var oldLevel;
	switch(newLevel){
		case "learning":oldLevel="unknown";break;
		case "unknown":oldLevel="known";break;
		case "known":oldLevel="learning";break;
	}
	var table = $('#sentencelistTable').DataTable();
	table.rows().every(function(rowIdx, tableLoop, rowLoop) {
        var rowData = this.data();
        let index = rowData["#"];
		let thisSentence = sentences.find(item => item.validSentenceIndex === index);
		 if (thisSentence.clickableWords.includes(word)) {
            
			let sentenceLength = thisSentence.clickableWords.length;
			let questionCount=0;
			thisSentence.clickableWords.forEach(function(word) {
				const matchingWord = lessonWordArray.find(function(lessonWord) {
					return lessonLanguage === "english" ? lessonWord.word.toLowerCase() === word.toLowerCase() : lessonWord.word === word;
				});
				if (matchingWord) {
					if (matchingWord.level === "known") {
					} else if (matchingWord.level === "learning") {
						questionCount++;
					}
					else{
						questionCount++;
					}
				}
			});

			let percentKnown = ((1-(questionCount/sentenceLength))*100).toFixed(2)+"%";
			rowData["%"] = percentKnown;
			rowData["x"] = questionCount;

		  // Update the data for the current row
		  this.data(rowData);
        }
    });
	colourSentences(table);
	// redraw the table, maintaining current paging position
    table.draw(false);

    // Check if the current page has any data
    //if (table.page.info().recordsDisplay == 0) {
    //    // If not, navigate to the last page that does
   //    table.page('previous').draw('page');
    //}
}





function updateWordInWordTable(word, newLevel) {
	
	var oldLevel;
	switch(newLevel){
		case "learning":oldLevel="unknown";break;
		case "unknown":oldLevel="known";break;
		case "known":oldLevel="learning";break;
	}
    // Get the DataTable instance
    var table = $('#wordlistTable').DataTable();
    var count = 0;

    // Iterate over each row in the table
    table.rows().every(function(rowIdx, tableLoop, rowLoop) {
        var data = this.data();
		 // Create a temporary DOM element and set its innerHTML to the data.Word
        var tempElement = document.createElement('div');
        tempElement.innerHTML = data.Word;

        // Get the text content of the tempElement, which will be the word without any HTML tags
        var innerWord = tempElement.textContent;
        // If this row's Word matches the specified word
        if (lessonLanguage === "english" ? innerWord.toLowerCase() == word.toLowerCase() : innerWord == word) {
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
    table.draw(false);

    // Check if the current page has any data
    if (table.page.info().recordsDisplay == 0) {
        // If not, navigate to the last page that does
        table.page('previous').draw('page');
    }
	
	colourWordTable(table);
}




function initialiseDataTables(){
	
			//TODO get default from settings
	document.getElementById('unknownRadioButton').checked = true;
    document.getElementById('learningRadioButton').checked = true;
	document.getElementById('knownRadioButton').checked = false;
	
	document.getElementById('hideKnownSentencesRadioButton').checked = true;
	
	$.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
  if (settings.nTable.id === 'wordlistTable') {
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
   if (settings.nTable.id === 'sentencelistTable') {
		var hideKnownSentences = document.getElementById("hideKnownSentencesRadioButton").checked;
		var unknownWordsInSentence = data[3];
		if (!hideKnownSentences){
			return true;
		}
		if (hideKnownSentences && unknownWordsInSentence != 0) {
		  return true;
		}
		// Check the condition based on the percentage
		//if (hideKnownSentences && percentKnown == "100.00%") {
		//	return false
		//}
		//if (!(hideKnownSentences && percentKnown == "100.00%")) {
		  //return true;
		//}
		//return true;
		return false;
	  }
  return true;
});

	

	
	
	
    var table;
    if (!$.fn.DataTable.isDataTable('#wordlistTable')) {
        // if table does not exist, initialize it with empty data
        table = $('#wordlistTable').DataTable({
			paging: true,
			scrollCollapse: false,
			deferRender: true,
			iDisplayLength: 25,
			info: false,
			lengthChange: false,
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
	$('#wordlistTable').on('click', 'tr:not(:first)', function() {
		// Get the DataTable instance
		var table = $('#wordlistTable').DataTable();

		// Get the data for the clicked row
		var data = table.row(this).data();

		// Get the word from the data
		var wordHtml = data.Word;

		// Create a temporary DOM element and set its innerHTML to the wordHtml
		var tempElement = document.createElement('div');
		tempElement.innerHTML = wordHtml;

		// Get the text content of the tempElement, which will be the word without any HTML tags
		var word = tempElement.textContent;
		
		pendingDictionaryLookup=word;
		jumpToWord(word);
		playWordTTS(word);
	});
	
	


	
    
    table.draw();
	
		// Event listener to the checkboxes, redraw on click
    $("input[name='status']").on("click", function () {
        table.draw();
    });
	

	
	
	
	var table2;
	if (!$.fn.DataTable.isDataTable('#sentencelistTable')) {
        // if table does not exist, initialize it with empty data
        table2 = $('#sentencelistTable').DataTable({
			paging: true,
			scrollCollapse: false,
			deferRender: true,
			lengthChange: false,
			iDisplayLength: 25,
			info: false,
			order: [[ 4, "desc" ]],
			select: 'single',
            scrollX: false,
            columns: [
                { data: "#" },
                { data: "Sentence" },
                { data: "n"},
                { data: "x" },
                { data: "%" }
            ]
        });
    } else {
        // if table already exists, clear it
        table2 = $('#sentencelistTable').DataTable();
        table2.clear();
    }
    
    table2.draw();
	
	$("#hideKnownSentencesRadioButton").on("click", function() {
		$('#sentencelistTable').DataTable().draw(); // redraw the table
	});
	

	
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
     console.log("Jumping to " + word);

    // Convert to lowercase if lessonLanguage is "english"
    const lookupWord = lessonLanguage == "english" ? word.toLowerCase() : word;

    // Get all .clickable-word elements that contain the word
    var wordElements = $("#learnText .page .clickable-word").filter(function() {
        // Convert to lowercase if lessonLanguage is "english"
        const elementText = lessonLanguage == "english" ? $(this).text().toLowerCase() : $(this).text();
        return elementText === lookupWord;
    });

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
/*
function getLastEditMode() {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(["settings"], "readonly");
        var store = transaction.objectStore("settings");
        var request = store.get('lastOpenedMode');

        request.onerror = function(event) {
            console.log("Error retrieving last opened mode: ", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = function(event) {  
            if(request.result) {
                p("Last used edit mode: "+request.result.mode);
                resolve(request.result.mode);
            } else {
                console.log("No last opened mode found!");
                resolve(""); // Returns an empty string if no mode found
            }
        };
    });
}
*/


/*
function saveLastEditMode(mode) {
    var transaction = db.transaction(["settings"], "readwrite");
    var store = transaction.objectStore("settings");
    var request = store.put({id: 'lastOpenedMode', mode: mode});

    request.onerror = function(event) {
        console.log("Error saving last opened mode: ", event.target.error);
    };

    request.onsuccess = function(event) {  
        console.log("Last opened mode saved successfully!");
    };
}
*/

function playWordTTS(word) {
    if(enableVoice) {
		
        // Stop and remove any utterances currently speaking or in the queue
        speechSynthesis.cancel();
		
		if (lessonLanguage == "chinese") {
			word = word.replace(/\s+/g, '');
		  }
		

        var utterance = new SpeechSynthesisUtterance(word);
		if(!voiceSelect)
		{
			voiceSelect = document.querySelector('#voice-selection');
		}
        // Get the selected voice from the dropdown
		if(!voiceSelect.selectedOptions){
			return;
		}
		
		// Get volume, rate, and pitch from the respective input controls
        var volume = document.getElementById('volume-control').value;
        var rate = document.getElementById('rate-control').value;
        var pitch = document.getElementById('pitch-control').value;

        // Set volume, rate, and pitch for the utterance
        utterance.volume = parseFloat(volume); // Volume value is between 0 and 1
        utterance.rate = parseFloat(rate); // Rate value is between 0.1 and 10
        utterance.pitch = parseFloat(pitch); // Pitch value is between 0 and 2
		
		if (voiceSelect && voiceSelect.selectedOptions && voiceSelect.selectedOptions.length > 0) {
			var selectedOption = voiceSelect.selectedOptions[0].value;
			var selectedOption = voiceSelect.selectedOptions[0].value;
			voices.forEach(function(voice) {
				if(voice.name === selectedOption) {
					utterance.voice = voice;
				}
			});

			

			// Speak the utterance
			speechSynthesis.speak(utterance);
		} else {
			console.warn('No selected option found');
			return; // Exit the function if no option is selected
		}
		
        
    }
}






function getLastScrollArray() {
    var scrollArray = settings.lastScrollArray;
    var currentScroll = getCurrentScroll();

    if (scrollArray) {
        var lessonExists = scrollArray.some(item => item.id == lessonID);
        
        if (lessonExists) {
            // update scrollArray
            scrollArray = scrollArray.map(item => {
                if (item.id == lessonID) {
                    return { ...item, scroll: currentScroll };
                } else {
                    return item;
                }
            });
        } else {
            // If lessonID is not in scrollArray, add it
            if (lessonID && lessonID != "") {
                scrollArray.push({ id: lessonID, scroll: currentScroll });
            }
        }
    } else {
        // If scrollArray doesn't exist, initialize it with the current lessonID and scroll
        if (lessonID && lessonID != "") {
            scrollArray = [{ id: lessonID, scroll: currentScroll }];
        } else {
            // handle case where there is no lessonID
            scrollArray = [];
        }
    }

    return scrollArray;
}

/*
function getVoiceSelection(){
    if($("#voice-selection").val() == "" || $("#voice-selection").val() == null){
        if(settings.voiceSelection){
            return settings.voiceSelection;
        } else {
            return "";
        }
    } else {
        return $("#voice-selection").val();
    }
}
*/

function getVoiceSelection() {
    var selectedVoice = $("#voice-selection").val();
    // If there's no selected voice, return the current settings or an empty array
    if (!selectedVoice) {
        return settings.voiceSelection || [];
    }

    // If voiceSelection is not already an array in settings, initialize it
    if (!Array.isArray(settings.voiceSelection)) {
        settings.voiceSelection = [];
    }

    // Find the object for the current lessonLanguage or create a new one
    var languageVoiceSettings = settings.voiceSelection.find(item => item.language === lessonLanguage) || { language: lessonLanguage };
    
    // Update the voice selection for the current lessonLanguage
    languageVoiceSettings.voice = selectedVoice;

    // If the object was newly created, add it to the array
    if (!settings.voiceSelection.includes(languageVoiceSettings)) {
        settings.voiceSelection.push(languageVoiceSettings);
    }

    return settings.voiceSelection;
}

function getDictionarySelection() {
    var selectedDictionaryLanguage = $("#dictionary-language-selection").val();
    // If there's no selected dictionary language, return the current settings or an empty array
    if (!selectedDictionaryLanguage) {
        return settings.dictionaryLanguage || [];
    }

    // If dictionaryLanguage is not already an array in settings, initialize it
    if (!Array.isArray(settings.dictionaryLanguage)) {
        settings.dictionaryLanguage = [];
    }

    // Find the object for the current lessonLanguage or create a new one
    var languageDictionarySettings = settings.dictionaryLanguage.find(item => item.lessonLanguage === lessonLanguage) || { lessonLanguage: lessonLanguage };
    
    // Update the dictionary language selection for the current lessonLanguage
    languageDictionarySettings.dictionaryLanguage = selectedDictionaryLanguage;

    // If the object was newly created, add it to the array
    if (!settings.dictionaryLanguage.includes(languageDictionarySettings)) {
        settings.dictionaryLanguage.push(languageDictionarySettings);
    }

    return settings.dictionaryLanguage;
}

function getFont() {
    var selectedFont = $("#font-selection").val();
    // If there's no selected font, return the current settings or an empty array
    if (!selectedFont) {
        return settings.font || [];
    }

    // If font is not already an array in settings, initialize it
    if (!Array.isArray(settings.font)) {
        settings.font = [];
    }

    // Find the object for the current lessonLanguage or create a new one
    var languageFontSettings = settings.font.find(item => item.lessonLanguage === lessonLanguage) || { lessonLanguage: lessonLanguage };
    
    // Update the font selection for the current lessonLanguage
    languageFontSettings.font = selectedFont;

    // If the object was newly created, add it to the array
    if (!settings.font.includes(languageFontSettings)) {
        settings.font.push(languageFontSettings);
    }

    return settings.font;
}



function scrollTo(pos){
	//if(getCurrentLearnMode()=="learnMode"){
        $('#nav-learn').scrollTop(pos);
    //}
    //else if(getCurrentLearnMode()=="editMode"){
   //     $('#nav-edit').scrollTop(pos);
   // }
}


function getCurrentScroll(){
    var currentScroll=0;
    //if(getCurrentLearnMode()=="learnMode"){
        currentScroll = $('#nav-learn').scrollTop();
    //}
    //else if(getCurrentLearnMode()=="editMode"){
    //    currentScroll = $('#nav-edit').scrollTop();
    //}
    return currentScroll;
}

function activateEditMode() {
    console.log("Activate edit mode.");
    learnMode="edit";
    $('#edit-button').addClass('active'); // add the active class when the button is clicked

    // Select all span elements inside the #learnText div
    let spans = document.querySelectorAll('#learnText span');

    // Loop through the selected elements
    for (let i = 0; i < spans.length; i++) {
        // Remove all classes
        spans[i].className = '';

        // Remove click and contextmenu event handlers
        $(spans[i]).off('click', onWordClick);
        $(spans[i]).off('contextmenu', onWordRightClick);
    }
    $('#learnText').off('contextmenu');
    $("#learnText").attr('contenteditable', 'true');

    // Set focus to the learnText div
    document.getElementById('learnText').focus();

    updateAndSaveSettings();
}



function activateLearnMode(){
	console.log("Activate learn mode.");
	learnMode="learn";
	$('#edit-button').removeClass('active');
	let text = document.getElementById('learnText').innerText;
	//if(lessonLanguage=="chinese")
	//{
	//	text = getConvertedChineseCharacters(text,$("#character-conversion-dropdown").val());
	//}
	loadTextIntoLearnTab(text,lessonLanguage);
	$('#nav-learn').trigger('scroll');
	$('#learnText').on('contextmenu');
	$("#learnText").attr('contenteditable', 'false');
	updateAndSaveSettings();
}

function toggleEditMode() {
    // Check if the edit-button is active (in edit mode)
    if ($('#edit-button').hasClass('active')) {
        // Get the text content from the learnText div
        var learnTextContent = document.getElementById('learnText').innerText.trim();

        // If the learnText div is empty
        if (learnTextContent === "") {
            // Alert the user with a message
            alert("Please paste or write text into the text area before proceeding.");
        } else {
            // Otherwise, activate learn mode
            activateLearnMode();
        }
    } else {
        // Activate edit mode
        activateEditMode();
    }
}



function getSettings() {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(["settings"], "readonly");
        var store = transaction.objectStore("settings");
        var settings = {};

        // Open a cursor to iterate over all the records in the store
        var request = store.openCursor();

        request.onerror = function(event) {
            console.log("Error retrieving settings: ", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = function(event) {  
            var cursor = event.target.result;

            if (cursor) {
                // Add each record to the settings object
                settings[cursor.value.id] = cursor.value.value;
                cursor.continue();
            } else {
                // After the cursor has gone through all the records, resolve the promise
                resolve(settings);
            }
        };
    });
}
    


function saveSettings(settings) {
	
    // Begin a new transaction
    var transaction = db.transaction(["settings"], "readwrite");
    
    // Get the object store
    var store = transaction.objectStore("settings");

    // Loop through each property in the settings object
    for (var key in settings) {
        if (settings.hasOwnProperty(key)) {
            // Put (or update) each value in the object store
            var request = store.put({id: key, value: settings[key]});

            request.onerror = function(event) {
                console.log("Error saving settings: ", event.target.error);
            };

            request.onsuccess = function(event) {
               // console.log("Setting saved successfully!");
            };
        }
    }
}

function resetColors() {
    // Reset CSS variables
	
	if(settings.unknownHighlighting){
		document.documentElement.style.setProperty('--unknown-word-bg', hexToRGBA(DEFAULT_UNKNOWN_HIGHLIGHT,1));
	}
	if(settings.learningHighlighting){
		document.documentElement.style.setProperty('--learning-word-bg', hexToRGBA(DEFAULT_LEARNING_HIGHLIGHT,1));
	}
	if(settings.knownHighlighting){
		document.documentElement.style.setProperty('--known-word-bg', hexToRGBA(DEFAULT_KNOWN_HIGHLIGHT,1));
	}
	document.documentElement.style.setProperty('--jump-word-bg', hexToRGBA(DEFAULT_JUMP_HIGHLIGHT,1));

	

    // Reset color picker values
    document.getElementById('unknown-color').value = DEFAULT_UNKNOWN_HIGHLIGHT;
    document.getElementById('learning-color').value = DEFAULT_LEARNING_HIGHLIGHT;
    document.getElementById('known-color').value = DEFAULT_KNOWN_HIGHLIGHT;
    document.getElementById('jump-color').value = DEFAULT_JUMP_HIGHLIGHT;
	
	document.getElementById('unknown-opacity').value = 1;
    document.getElementById('learning-opacity').value = 1;
    document.getElementById('known-opacity').value = 1;
    document.getElementById('jump-opacity').value = 1;
	
	//reset word colour
	let styles, colour, textColor;
	styles = getComputedStyle(document.documentElement);
	
	
	colour = rgbaToHex(styles.getPropertyValue('--unknown-word-bg').trim());
	textColor = getContrastColor(colour);
    document.documentElement.style.setProperty('--unknown-word-text-colour', textColor);
	
	colour = rgbaToHex(styles.getPropertyValue('--learning-word-bg').trim());
	textColor = getContrastColor(colour);
    document.documentElement.style.setProperty('--learning-word-text-colour', textColor);
			
	colour = rgbaToHex(styles.getPropertyValue('--known-word-bg').trim());
	textColor = getContrastColor(colour);
    document.documentElement.style.setProperty('--known-word-text-colour', textColor);
	
	colour = rgbaToHex(styles.getPropertyValue('--jump-word-bg').trim());
	textColor = getContrastColor(colour);
    document.documentElement.style.setProperty('--jump-word-text-colour', textColor);
	
	//let textColor = getContrastColor(settings.unknownHighlightColour);
	//document.documentElement.style.setProperty('--unknown-word-text-colour', textColor);
	
	updateAndSaveSettings();
}


function applyColorChange(cssVar) {
    // Set the new value for the CSS variable
    //document.documentElement.style.setProperty(cssVar, rgbaColor);
	
	let colorInput, opacityInput, bgColour, opacity, rgbaColour;
	switch (cssVar) {
        case '--unknown-word-bg':
            colorInput = $(`#unknown-color`);
			opacityInput = $(`#unknown-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;
        case '--learning-word-bg':
            colorInput = $(`#learning-color`);
			opacityInput = $(`#learning-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;
        case '--known-word-bg':
            colorInput = $(`#known-color`);
			opacityInput = $(`#known-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;
		case '--jump-word-bg':
            colorInput = $(`#jump-color`);
			opacityInput = $(`#jump-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;	
        default:
            console.error(`Invalid CSS variable name: ${cssVar}`);
            return;
    }
	
	

    let styles, colour, textColor;
    // Update the settings object and save it to storage
    switch (cssVar) {
        case '--unknown-word-bg':
            styles = getComputedStyle(document.documentElement);
            colour = rgbaToHex(styles.getPropertyValue('--unknown-word-bg').trim());
            textColor = getContrastColor(colour);
            document.documentElement.style.setProperty('--unknown-word-text-colour', textColor);
            break;
        case '--learning-word-bg':
            styles = getComputedStyle(document.documentElement);
            colour = rgbaToHex(styles.getPropertyValue('--learning-word-bg').trim());
            textColor = getContrastColor(colour);
            document.documentElement.style.setProperty('--learning-word-text-colour', textColor);
            break;
        case '--known-word-bg':
            styles = getComputedStyle(document.documentElement);
            colour = rgbaToHex(styles.getPropertyValue('--known-word-bg').trim());
            textColor = getContrastColor(colour);
            document.documentElement.style.setProperty('--known-word-text-colour', textColor);
            break;
		case '--jump-word-bg':
            styles = getComputedStyle(document.documentElement);
            colour = rgbaToHex(styles.getPropertyValue('--jump-word-bg').trim());
            textColor = getContrastColor(colour);
            document.documentElement.style.setProperty('--jump-word-text-colour', textColor);
            break;	
        default:
            console.error(`Invalid CSS variable name: ${cssVar}`);
            return;
    }

    updateAndSaveSettings();
}
/*
function applyColorChangeWithHex(cssVar, hex, opacity){
	let colorInput, opacityInput, bgColour, opacity, rgbaColour;
	switch (cssVar) {
        case '--unknown-word-bg':
            colorInput = $(`#unknown-color`);
			opacityInput = $(`#unknown-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;
        case '--learning-word-bg':
            colorInput = $(`#learning-color`);
			opacityInput = $(`#learning-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;
        case '--known-word-bg':
            colorInput = $(`#known-color`);
			opacityInput = $(`#known-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;
		case '--jump-word-bg':
            colorInput = $(`#jump-color`);
			opacityInput = $(`#jump-opacity`);
			bgColour = colorInput.val();
			opacity = opacityInput.val();
			rgbaColour = hexToRGBA(bgColour, opacity);
			document.documentElement.style.setProperty(cssVar, rgbaColour);
            break;	
        default:
            console.error(`Invalid CSS variable name: ${cssVar}`);
            return;
    }
	
	

    let styles, colour, textColor;
    // Update the settings object and save it to storage
    switch (cssVar) {
        case '--unknown-word-bg':
            styles = getComputedStyle(document.documentElement);
            colour = rgbaToHex(styles.getPropertyValue('--unknown-word-bg').trim());
            textColor = getContrastColor(colour);
            document.documentElement.style.setProperty('--unknown-word-text-colour', textColor);
            break;
        case '--learning-word-bg':
            styles = getComputedStyle(document.documentElement);
            colour = rgbaToHex(styles.getPropertyValue('--learning-word-bg').trim());
            textColor = getContrastColor(colour);
            document.documentElement.style.setProperty('--learning-word-text-colour', textColor);
            break;
        case '--known-word-bg':
            styles = getComputedStyle(document.documentElement);
            colour = rgbaToHex(styles.getPropertyValue('--known-word-bg').trim());
            textColor = getContrastColor(colour);
            document.documentElement.style.setProperty('--known-word-text-colour', textColor);
            break;
        default:
            console.error(`Invalid CSS variable name: ${cssVar}`);
            return;
    }
}
*/
function rgbaToHex(rgba) {
    // Check if rgba color
    if (!rgba || !rgba.includes('rgba')) {
        return rgba; // return original color if it's not in rgba format
    }

    // Choose correct separator
    let sep = rgba.indexOf(",") > -1 ? "," : " ";
    // Turn "rgba(r, g, b, a)" into [r, g, b, a]
    rgba = rgba.substr(5).split(")")[0].split(sep);

    let r = (+rgba[0]).toString(16),
        g = (+rgba[1]).toString(16),
        b = (+rgba[2]).toString(16);

    if (r.length == 1)
        r = "0" + r;
    if (g.length == 1)
        g = "0" + g;
    if (b.length == 1)
        b = "0" + b;

    return "#" + r + g + b;
}

function hexToRGBA(hex, opacity) {
    const hexValue = hex.replace('#', '');
    const r = parseInt(hexValue.substring(0, 2), 16);
    const g = parseInt(hexValue.substring(2, 4), 16);
    const b = parseInt(hexValue.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}




function getContrastColor(color) {
    // Create a temporary div to apply color and get the computed style
    let tempDiv = document.createElement("div");
    tempDiv.style.color = color;
    document.body.appendChild(tempDiv);

    // Get computed color value, will always be in "rgb(r, g, b)" format
    let computedColor = window.getComputedStyle(tempDiv).color;

    // Clean up temp element
    document.body.removeChild(tempDiv);

    // Parse rgb values
    let colorMatch = computedColor.match(/\((\d+),\s*(\d+),\s*(\d+)\)/);
    let r = parseInt(colorMatch[1]);
    let g = parseInt(colorMatch[2]);
    let b = parseInt(colorMatch[3]);

    // Calculate luminance (perceived brightness)
    let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return contrasting color, based on perceived brightness
    return (luminance > 0.5) ? '#333333' : '#cccccc';
}





function getPreferredTheme(){
	let theme;

	// Check if the OS prefers a dark theme
	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		theme = 'dark';
	} else {
		theme = 'light';
	}
	return theme;
}

function getTheme(){
	let theme = document.documentElement.getAttribute('data-bs-theme');
	return theme;
}

function setTheme(theme){
	if(theme){
		document.documentElement.setAttribute('data-bs-theme', theme);
	}
	
	let styles, colour, textColor, bgColour;
	
	styles = getComputedStyle(document.documentElement);
	
	switch(theme){
		case "light": bgColour=styles.getPropertyValue('--light-background-colour-primary'); break;
		case "dark": bgColour=styles.getPropertyValue('--dark-background-colour-primary'); break;
		default: console.log("Theme not found."); return;
	}
	
	textColor = getContrastColor(bgColour);
    document.documentElement.style.setProperty('--nonword-text-colour', textColor);
	
	updateAndSaveSettings();
}


function changeTextSize(){
	let textSize = $('#text-size').val();
	$('#learnText').css('font-size', textSize + 'em');
	if(learnMode=="learn"){
		activateLearnMode();
	}
	updateAndSaveSettings();
}

function changeFont(){
	let font = $('#font-selection').val();
	$('#learnText').css('font-family', font);
	updateAndSaveSettings();
}

function onChangeDictionaryLanguage(){
	let dictLang = $('#dictionary-language-selection').val();
	setDictionaryLanguage(dictLang);
	updateAndSaveSettings();
}

function setDictionaryLanguage(lang) {
    if (lang != currentDictionaryLanguage) {
        currentDictionaryLanguage = lang;
        $("#dictionary-language-selection").val(lang); // Update the dropdown selection

        if (sidebarTab == "dictionary") {
            handleDictionaryLookup();
        }
    }
}

function populateFontOptions() {
  var fontOptions;

	switch (lessonLanguage) {
	  case "korean":
		fontOptions = `
		  <option value="Arial">Arial</option>
		  <option value="Malgun Gothic">Malgun Gothic</option>
		  <option value="Dotum">Dotum</option>
		  <option value="Gulim">Gulim</option>
		  <option value="Gungsuh">Gungsuh</option>
		  <option value="Batang">Batang</option>
		`;
		break;
	  case "english":
		fontOptions = `
		  <option value="Arial">Arial</option>
		  <option value="Times New Roman">Times New Roman</option>
		  <option value="Georgia">Georgia</option>
		  <option value="Verdana">Verdana</option>
		  <option value="Trebuchet MS">Trebuchet MS</option>
		  <option value="Courier New">Courier New</option>
		`;
		break;
	  case "chinese":
		fontOptions = `
		  <option value="Arial">Arial</option>
		  <option value="SimSun">SimSun</option>
		  <option value="SimHei">SimHei</option>
		  <option value="Microsoft YaHei">Microsoft YaHei</option>
		  <option value="PMingLiU">PMingLiU</option>
		`;
		break;
	  default:
		// You can specify a default font option if needed
		fontOptions = `<option value="Arial">Arial</option>`;
	}



  $('#font-selection').html(fontOptions);
}

function segmentChineseText(originalText, trie) {
  // Convert the entire text to simplified characters
  let text = getConvertedChineseCharacters(originalText, "traditional-to-simplified");

  // This array will store the segmented simplified Chinese for processing
  let simplifiedSegments = [];
  
  // This will store the segments in the original format
  let originalSegments = [];

  while (text.length > 0) {
    let found = false;
    let node = trie;
    let endIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (node[char]) {
        node = node[char];
        if (node.isWord) endIndex = i + 1;
      } else break;
    }

    if (endIndex > 0) {
      simplifiedSegments.push(text.substring(0, endIndex));
      text = text.substring(endIndex);
      found = true;
    }

    if (!found) {
      let char = text[0];
      if (/[\u4e00-\u9fa5]/.test(char)) {
        simplifiedSegments.push(char);
      } else if (char === '\n') {
        simplifiedSegments.push("<br>");
      } else {
        simplifiedSegments.push(char);
      }
      text = text.substring(1);
    }
  }

  // Now, map the simplified segments back to the original text
  let currentIndex = 0;
  simplifiedSegments.forEach(segment => {
    const originalSegment = originalText.substring(currentIndex, currentIndex + segment.length);
    if (segment === "<br>") {
      originalSegments.push(segment);
    } else {
      originalSegments.push(originalSegment);
    }
    currentIndex += segment.length;
  });

  // Decide what to return based on dropdown value
  let conversionType = $("#character-conversion-dropdown").val();
  if (conversionType === "traditional-to-simplified") {
    return simplifiedSegments.join(' ');
  } else if (conversionType === "none") {
    return originalSegments.join(' ');
  } else if (conversionType === "simplified-to-traditional") {
    return originalSegments.map(segment => {
      return getConvertedChineseCharacters(segment, conversionType);
    }).join(' ');
  } else {
    alert("Dropdown state not found.");
    return originalText;
  }
}





function buildTrie(words) {
  const root = {};

  for (const word of words) {
    let node = root;
    for (const char of word) {
      if (!node[char]) node[char] = {};
      node = node[char];
    }
    node.isWord = true;
  }

  return root;
}





function loadChineseWordList() {
  return new Promise((resolve, reject) => {
    var scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    scriptElement.src = "wordlists/zh/globalList.js";
    scriptElement.onload = function() {
      // Once the script is loaded, resolve the promise
      resolve(globalList().map(obj => obj.w));
    };
    scriptElement.onerror = function() {
      // If there's an error loading the script, reject the promise
      reject(new Error("Failed to load Chinese word list."));
    };
    document.getElementsByTagName("head")[0].appendChild(scriptElement);
  });
}





function initialiseSettings() {
	   return getSettings().then((settings) => {
	
		window.settings = settings; // Assign to a global variable
		
        // Note: if initialiseLesson returns a Promise, you should return it here
        return initialiseLesson().then(() => {
            // Log each setting
            for (let key in settings) {
                console.log(`Setting found ${key}: ${settings[key]}`);
            }

            if (lessonLanguage === "chinese") {
                // Return this promise to ensure that trie is built before the main promise is resolved
                return loadChineseWordList()
                    .then(validChineseWords => {
                        trie = buildTrie(validChineseWords);
                        // Continue with your code that depends on trie
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
            // If lessonLanguage is not "chinese", resolve the promise without further action
            return Promise.resolve();
        })
        .then(() => {
            // Handle the rest of your settings logic here
            var enableTTS = settings.enableTTS;
            voiceSelection = settings.voiceSelection;
            var volume = settings.volume;
            var pitch = settings.pitch;
            var rate = settings.rate;
            var sidebarVisible = settings.sidebarVisible;
			
	
		if(sidebarVisible!=null)
		{
			if(sidebarVisible!=isSidebarVisible())
			{
					toggleSidebarTab(sidebarTab);
			}
		}
	
	
        // Check the enableTTS checkbox if it is true
        if (enableTTS) {
            $("#enable-tts-checkbox").prop('checked', true);
			var changeEvent = new Event('change');
			document.getElementById('enable-tts-checkbox').dispatchEvent(changeEvent);
        }

        // Select the voice if it exists in the list
        //if (voiceSelection) {
        //    $('#voice-selection').val(voiceSelection);
       // }
	   if (voiceSelection) {
			var selectedVoice = voiceSelection.find(function(obj) {
				return obj.language === lessonLanguage;
			});

			if (selectedVoice) {
				$('#voice-selection').val(selectedVoice.voice);
				console.log('Voice selection for ' + lessonLanguage + ':', selectedVoice.voice);
			}
	   }


        // Set volume, pitch, and rate sliders' values
        if (volume) {
            $("#volume-control").val(volume);
			
			var volumeControl = $("#volume-control");
			var volumeValue = $("#volume-value");
			volumeValue.text(volumeControl.val());
        }

        if (pitch) {
            $("#pitch-control").val(pitch);
			
			var pitchControl = $("#pitch-control");
			var pitchValue = $("#pitch-value");
			pitchValue.text(pitchControl.val());
        }

        if (rate) {
            $("#rate-control").val(rate);
			
			var rateControl = $("#rate-control");
			 var rateValue = $("#rate-value");
			 rateValue.text(rateControl.val());
        }
		
		
		if (settings.unknownOpacity) {
            $("#unknown-opacity").val(settings.unknownOpacity);
        }
		
		if (settings.learningOpacity) {
            $("#learning-opacity").val(settings.learningOpacity);
        }
		
		if (settings.knownOpacity) {
            $("#known-opacity").val(settings.knownOpacity);
        }
		
		if (settings.jumpOpacity) {
            $("#jump-opacity").val(settings.jumpOpacity);
        }
		
		
		if (settings.unknownHighlightColour) {
            document.documentElement.style.setProperty('--unknown-word-bg', settings.unknownHighlightColour);
            $('#unknown-color').val(settings.unknownHighlightColour);
			let textColor = getContrastColor(settings.unknownHighlightColour);
			document.documentElement.style.setProperty('--unknown-word-text-colour', textColor);
        }

        if (settings.learningHighlightColour) {
            document.documentElement.style.setProperty('--learning-word-bg', settings.learningHighlightColour);
            $('#learning-color').val(settings.learningHighlightColour);
			let textColor = getContrastColor(settings.learningHighlightColour);
			document.documentElement.style.setProperty('--learning-word-text-colour', textColor);
        }

        if (settings.knownHighlightColour) {
            document.documentElement.style.setProperty('--known-word-bg', settings.knownHighlightColour);
            $('#known-color').val(settings.knownHighlightColour);
			let textColor = getContrastColor(settings.knownHighlightColour);
			document.documentElement.style.setProperty('--known-word-text-colour', textColor);
        }

        if (settings.jumpHighlightColour) {
            document.documentElement.style.setProperty('--jump-word-bg', settings.jumpHighlightColour);
            $('#jump-color').val(settings.jumpHighlightColour);
			let textColor = getContrastColor(settings.jumpHighlightColour);
			document.documentElement.style.setProperty('--jump-word-text-colour', textColor);
        }
		
		 // Set highlight colors
        if (settings.unknownHighlightColour && settings.unknownOpacity) {
			applyColorChange('--unknown-word-bg');
        }

        if (settings.learningHighlightColour && settings.learningOpacity) {
			applyColorChange('--learning-word-bg');
        }

        if (settings.knownHighlightColour && settings.knownOpacity) {
			applyColorChange('--known-word-bg');
        }

        if (settings.jumpHighlightColour && settings.jumpOpacity) {
			applyColorChange('--jump-word-bg');
        }
		


		if(settings.textSize){
			let textSize = settings.textSize;
			$('#text-size').val(textSize);
			$('#learnText').css('font-size', textSize + 'em');
		}
		
		/*
		if(settings.dictionaryLanguage){
			$('#dictionary-language-selection').val(settings.dictionaryLanguage);
			setDictionaryLanguage(settings.dictionaryLanguage);
		}
		*/
		
		populateDictionaryLanguageOptions();
		
		if (settings.dictionaryLanguage) {
			//console.log('settings.dictionaryLanguage:', settings.dictionaryLanguage);
		  var selectedDictionaryLanguage = settings.dictionaryLanguage.find(function(obj) {
			return obj.lessonLanguage === lessonLanguage;
		  });

		  if (selectedDictionaryLanguage && selectedDictionaryLanguage.dictionaryLanguage) {
			$('#dictionary-language-selection').val(selectedDictionaryLanguage.dictionaryLanguage);
			console.log('Dictionary language selection for ' + lessonLanguage + ':', selectedDictionaryLanguage.dictionaryLanguage);
			setDictionaryLanguage(selectedDictionaryLanguage.dictionaryLanguage);
		  }
		}

		
		
		if(!currentDictionaryLanguage)
		{
			switch(lessonLanguage)
			{
				case "english": setDictionaryLanguage(DEFAULT_DICTIONARY_LANGUAGE_ENGLISH); break;
				case "korean": setDictionaryLanguage(DEFAULT_DICTIONARY_LANGUAGE_KOREAN); break;
				case "chinese": setDictionaryLanguage(DEFAULT_DICTIONARY_LANGUAGE_CHINESE); break;
				default:console.error("Language not found");
			}
		}
		
		switch(lessonLanguage)
		{
				case "english": document.querySelector('#dictionary-iframe').src = DEFAULT_DICTIONARY_URL_ENGLISH; break;
				case "korean": document.querySelector('#dictionary-iframe').src = DEFAULT_DICTIONARY_URL_KOREAN; break;
				case "chinese": document.querySelector('#dictionary-iframe').src = DEFAULT_DICTIONARY_URL_CHINESE; break;
				default:console.error("Language not found");
		}
		
		populateFontOptions();
		
		if (Array.isArray(settings.font) && settings.font.some(obj => obj.hasOwnProperty('font') && obj.hasOwnProperty('lessonLanguage'))) {
			var selectedFont = settings.font.find(function(obj) {
				return obj.lessonLanguage === lessonLanguage;
			});

			if (selectedFont && selectedFont.font) {
				$('#font-selection').val(selectedFont.font);
				console.log('Font selection for ' + lessonLanguage + ':', selectedFont.font);
				$('#learnText').css('font-family', selectedFont.font);
			} else {
				$('#learnText').css('font-family', DEFAULT_FONT);
			}
		} else {
			$('#learnText').css('font-family', DEFAULT_FONT);
		}

	
		if(settings.chineseCharacterConversion){
			$("#character-conversion-dropdown").val(settings.chineseCharacterConversion);
		}	
		
		if(lessonLanguage == "chinese"){
			$("#chineseSettings").show();
		}
		else{
			$("#chineseSettings").hide();
		}



		
		if (settings.theme) {
			setTheme(settings.theme);
		}
		else{
			setTheme(getPreferredTheme());
		}
		
		});
    });
}

function updateAndSaveSettings() {
	
	if(!initialisationComplete){
			return;
	}
	
	// If a timeout is already scheduled, cancel it
	if (settingsDebounceTimeout) {
		clearTimeout(settingsDebounceTimeout);
	}

	// Schedule a new timeout
	settingsDebounceTimeout = setTimeout(function() {
		// Get the current settings.
		var settings = {
			enableTTS: $("#enable-tts-checkbox").is(":checked"),
			voiceSelection: getVoiceSelection(),
			volume: $("#volume-control").val(),
			pitch: $("#pitch-control").val(),
			rate: $("#rate-control").val(),
			lastOpenedLesson: lessonID,
			lastOpenedLearnMode: learnMode,
			lastScrollArray: getLastScrollArray(),
			sidebarVisible:isSidebarVisible(),
			unknownHighlightColour:$('#unknown-color').val(),
			learningHighlightColour:$('#learning-color').val(),
			knownHighlightColour:$('#known-color').val(),
			jumpHighlightColour:$('#jump-color').val(),
			theme: getTheme(),
			font: getFont(),
			textSize: $("#text-size").val(),
			unknownOpacity: $("#unknown-opacity").val(),
			learningOpacity: $("#learning-opacity").val(),
			knownOpacity: $("#known-opacity").val(),
			jumpOpacity: $("#jump-opacity").val(),
			dictionaryLanguage:getDictionarySelection(),
			chineseCharacterConversion:$("#character-conversion-dropdown").val(),
		};

		console.log("Saving settings.");
		// Save settings to the database
		saveSettings(settings);

		// Clear the timeout
		settingsDebounceTimeout = null;
	}, 1000);
}

function onLoginButtonPress() {
	var user = firebase.auth().currentUser;
	if (user) {
		handleSignOut().then(() => {
			window.location.href = 'login.html';
		});
	} else {
		window.location.href = 'login.html';
	}
}

function populateDictionaryLanguageOptions() {
    var selectElement = document.getElementById('dictionary-language-selection');

    var englishLangCodeToNameMap = {
        "zh": "Chinese (Youdao)",
        "ko": "Korean (Naver)",
    };

    var koreanLangCodeToNameMap = {
        "zh": "Chinese",
        "en": "English",
        "fr": "French",
        "de": "German",
        "hi": "Hindi",
        "id": "Indonesian",
        "it": "Italian",
        "ja": "Japanese",
        "pt": "Portuguese",
        "ru": "Russian",
        "es": "Spanish",
        "th": "Thai",
        "vi": "Vietnamese",
    };
	
	var chineseLangCodeToNameMap = {
        "en": "English (Youdao)",
        "ko": "Korean (Naver)",
    };

    var langCodeToNameMap;
    switch (lessonLanguage) {
        case "english":
            langCodeToNameMap = englishLangCodeToNameMap;
            break;
        case "korean":
            langCodeToNameMap = koreanLangCodeToNameMap;
            break;
        case "chinese":
            langCodeToNameMap = chineseLangCodeToNameMap;
            break;
        default:
            console.error("Language code not found.");; // Default to an empty map or handle as needed
    }
	
    var options = Object.keys(langCodeToNameMap);

    // Remove all existing options
    selectElement.innerHTML = "";

    // Sort options alphabetically by name
    options.sort(function(a, b) {
        return langCodeToNameMap[a].localeCompare(langCodeToNameMap[b]);
    });

    // Add new options
    options.forEach(function(langCode) {
        var option = document.createElement('option');
        option.value = langCode;
        option.text = langCodeToNameMap[langCode]; // Using the mapping to convert language codes to human-readable names
        selectElement.appendChild(option);
    });
}

function getConvertedChineseCharacters(text,conversionType){
	switch(conversionType){
		case "none": return text;
		case "simplified-to-traditional": return($.s2t(text));
		case "traditional-to-simplified": return($.t2s(text));
		default: alert("Dropdown state not found.");
	}
		
}
