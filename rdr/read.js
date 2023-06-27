var isDebugMode = true;
var lessonLanguage = "ko";
var dbfire;
const wordsPerPage = 100;
const pagesToLookAheadBehind = 2;
var scrollDebounceTimer;
const scrollDebounceTimeout = 40;
const colouriseTimeout = 5;
const saveVocabularyTimeout = 4000;
var pageMax=0;
var colourisePending = false;
var colouriseInProgress = false;
var vocabularySaveInProgress = false;
var signedInState = "signedOut";
var db;
var	vocabularyLearning;
var	vocabularyKnown;
var	vocabularyUnknown;
var lessonWordArray=[];
var lessonWordCount=0;
var lessonSavingEnabled=false;
var lessonID;

//var protectText = false;

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
  // Your initialise function here
  initialise();
});

function p(...messages) {
  if (isDebugMode) {
    console.log(...messages);
  }
}

function initialise(){
	// Show loading overlay
	p("Start initialise");
	document.getElementById('loading-overlay').style.display = 'flex';
	initialiseIndexedDB(function() {
		p("Completed initialiseIndexedDB");
		initialiseFirebase();
		p("Completed initialiseFirebase");
		initialiseVocabulary();
		p("Completed initialiseVocabulary");
		initialiseUI();
		p("Completed initialiseUI");
		initialiseTextSaving();
		p("Completed initialiseTextSaving");
		// Hide loading overlay
		document.getElementById('loading-overlay').style.display = 'none';
	});
	
	
}

function initialiseTextSaving(){
	let saveTimeout = null;
	const saveDelay = 5000; // Save after 5 seconds
	const textarea = document.getElementById('editText');

	// Listen for input events (i.e., when the user types in the textarea)
	textarea.addEventListener('input', () => {
		// If a save is already scheduled, cancel it
		if (saveTimeout !== null) {
			clearTimeout(saveTimeout);
		}

		// Schedule a new save
		saveTimeout = setTimeout(() => {
			//TODO disable saving for premade lessons
			if(lessonSavingEnabled){
				var lesson = {
					title: lessonID,
					text: document.getElementById('editText').value
				};
				
				saveCustomLessonToIndexedDB(lesson);
				p("lesson saved");
			}
			// This is where you'd put your saving code. For now, just log the text.
			

			// Optionally, you can use IndexedDB or any other storage mechanism to store the data.
			// For example: saveToIndexedDB(textarea.value);
			
			// Reset saveTimeout so we know no save is scheduled
			saveTimeout = null;
		}, saveDelay);
	});
}

// initialise Firebase
function initialiseFirebase() {
  firebase.initializeApp(firebaseConfig);
  dbfire = firebase.firestore();
}



firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    p("User has logged in.");
	logUser(user);
	displaySigninElements("signedInMode");
	signedInState="signedIn";
  } else {
    // No user is signed in.
	if (window.location.protocol === "file:") {
		// Running locally
		displaySigninElements("offlineMode");
		signedInState="offline";
	} 
	else
	{
		displaySigninElements("signedOutMode");
		signedInState="signedOut";
	}
  }
});

function initialiseUI(){
	if (window.location.protocol === "file:") {
		// Running locally
		displaySigninElements("offlineMode");
		p("User is running the website locally");
	} 

	document.getElementById('nav-learn').addEventListener('scroll', function(e) {
		clearTimeout(scrollDebounceTimer);
		scrollDebounceTimer = setTimeout(() => {
			let visibleSpans = findVisibleSpans();
			setActiveText(visibleSpans.firstVisible,visibleSpans.lastVisible);
			if (!colouriseInProgress) {
                    colouriseInProgress = true;
                    colourisePage(); // initiate the colorising operation
            }
			
		}, scrollDebounceTimeout);
	});
	//document.addEventListener('DOMContentLoaded', function() {
		  var sidebar = document.getElementById('sidebar');
		  var sidebarContainer = document.querySelector('.sidebar-container');
		  var textareaContainer = document.querySelector('.textarea-container');
		  var textareaFullscreenButton = document.getElementById('textareaFullscreenButton');
		  var sidebarFullscreenButton = document.getElementById('sideBarFullscreenButton');
		  var navLearnTab = document.getElementById('nav-learn-tab');
		  var clearTextButton = document.getElementById('nav-clear-tab');
		  
			
		  textareaFullscreenButton.addEventListener('click', function() {
			if(sidebarContainer.classList.contains('hidden')) {
				  sidebarContainer.classList.remove('hidden');
				  textareaContainer.classList.remove('full-width');
				} else {
				  sidebarContainer.classList.add('hidden');
				  textareaContainer.classList.add('full-width');
				  sidebarContainer.classList.remove('full-width');
			}
		  });
		  
		  sidebarFullscreenButton.addEventListener('click', function() {
			if(textareaContainer.classList.contains('hidden')) {
				  textareaContainer.classList.remove('hidden');
				  sidebarContainer.classList.remove('full-width');
				} else {
				  textareaContainer.classList.add('hidden');
				  sidebarContainer.classList.add('full-width');
				  textareaContainer.classList.remove('full-width');
			}
		  });
		  
		  
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
						// If no last opened lesson ID is found, redirect to content.html
						window.location.href = 'content.html';
					}
				});
			}

		  


			navLearnTab.addEventListener('show.bs.tab', function(e) {
				loadTextIntoLearnTab(document.getElementById('editText').value,lessonLanguage);
				document.getElementById('nav-learn').dispatchEvent(new Event('scroll'));
			});
			
		
		clearTextButton.addEventListener('click', () => {
			//if(protectText)
			//{
			//	alert(protectTextMessage);
			//}
			//else
			//{
				// Clear the text in the 'Edit' tab
				document.getElementById('editText').value = '';	
				activateEditTab();	
			//}
		});
	//});
}



window.handleCredentialResponse = (response) => {
	onSignIn(); 
}
	
	function toggleSignIn() {
      if (firebase.auth().currentUser) {
        // [START signout]
		handleSignOut();
        //firebase.auth().signOut();
		displaySigninElements("signedOutMode");
        // [END signout]
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
        // Sign in with email and pass.
        // [START authwithemail]
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
          // Handle Errors here.
		  p("toggle sign in 2");
          var errorCode = error.code;
          var errorMessage = error.message;
          // [START_EXCLUDE]
          if (errorCode === 'auth/wrong-password') {
            alert('Wrong password.');
          } else {
            alert(errorMessage);
          }
          p(error);
		  p("Signed in with email");
		  displaySigninElements("signedInMode");
          // [END_EXCLUDE]
        });
        // [END authwithemail]
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

			// This gives you a Google Access Token. You can use it to access the Google API.
			var token = credential.accessToken;
			// The signed-in user info.
			var user = result.user;
			// IdP data available in result.additionalUserInfo.profile.
			  // ...
			  p("Signed in with Google");
			  displaySigninElements("signedInMode");
		  }).catch((error) => {
			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;
			// The email of the user's account used.
			var email = error.email;
			// The firebase.auth.AuthCredential type that was used.
			var credential = error.credential;
			// ...
		  });
    }
	
	function handleSignOut() {
		firebase.auth().signOut().then(() => {
		  // Sign-out successful.
		  displaySigninElements("signedOutMode");
		}).catch((error) => {
		  // An error happened.
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
				document.getElementById("loggedInState").innerText = "Signed in as "+firebase.auth().currentUser.displayName;
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
  // Load lesson text based on lessonName
  p("Loading lesson:", lessonID);
	if (/^custom\d+$/.test(lessonID)) {
		p("Custom lesson loading...");
		initCustomLesson();
	}
	else{
	  fetch(`lessons/${lessonID}.json`)  // use backticks here
		.then(response => {
		  if (!response.ok) {
			throw new Error('Lesson failed to load');
		  }
		  return response.json();
		})
		.then(lesson => {
			p("Premade lesson loading...");
			// Now you can work with your lesson object
			//processLessonJson(lesson);
			initPremadeLesson(lesson.title, lesson.text);
		})
		.catch(error => console.error('Error:', error));
	}
}

function activateEditTab(){
	if (!document.getElementById('nav-edit-tab').classList.contains('active')) {
		// Set the 'Edit' tab as the active tab
		document.getElementById('nav-edit-tab').classList.add('active');
		document.getElementById('nav-edit').classList.add('show', 'active');

		// Remove the 'active' class from the 'Learn' tab
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
	//protectText = true;
	//protectTextMessage = "Content editing is not permitted for pre-set lessons.";
	document.getElementById('nav-clear-tab').disabled=true;
	
	document.getElementById('textarea-navbar-title').innerText = title;
	lessonSavingEnabled=false;
	//load text into edit mode text area
	const textarea = document.getElementById('editText');
	textarea.value = text;
    
    // Trigger the input event
    textarea.dispatchEvent(new Event('input'));
	//var navLearnTab = document.getElementById('nav-learn-tab');
	//navLearnTab.addEventListener('show.bs.tab', function(e) {
	//			loadTextIntoLearnTab(document.getElementById('editText').value);
	//		});
	
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
    let chunks = text.split(/(\s|\n)/).flatMap((chunk) => {
        if(/\n/.test(chunk)) {
            // If the chunk is a newline, return a <br> element
            return '<span class="non-text"><br></span>';
        } else if (/\s/.test(chunk)) {
            // If the chunk is whitespace, return it as-is
            return '<span class="non-text">&nbsp;</span>';
        } else {
            let subChunks;
            // Further split the chunk into Korean and non-Korean text
            if (language == "ko") {
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
                if ((language == "ko" && /[\uAC00-\uD7AF]/.test(subChunk)) ||
                    (language == "en" && /[a-zA-Z]/.test(subChunk)) ||
                    (language == "cn" && /[\p{Script=Han}]/u.test(subChunk))) {
                    // If the subChunk is in the appropriate language, wrap it in a span
                    return `<span class="clickable-word">${subChunk}</span>`;
                } else {
                    // If the subChunk is not a word (or if the language is not correct), it's non-text
                    return `<span class="non-text">${subChunk}</span>`;
                }
            });
        }
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

	const words = learnTextElement.querySelectorAll('.clickable-word');
	var lessonText = [];
    words.forEach(word => {
		lessonText.push(word.textContent);
        word.addEventListener('click', () => {
            const wordText = word.textContent;
            handleWordClick(wordText);
        });
    });
	initialiseLessonText(lessonText);
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
    promoteOneLevel(word);
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
        setTimeout(saveVocabulary, saveVocabularyTimeout); 
    }
}

function promoteOneLevel(word){
	let wordObj = lessonWordArray.find(w => w.word === word);
	if(!wordObj){
		console.error("Word "+word+" not found in lesson text.");
	}
	
	switch(wordObj.level){
		case "known": wordObj.level = "unknown"; break;
		case "learning": wordObj.level = "known"; break;
		case "unknown": wordObj.level = "learning"; break;
		default: console.error("Word "+word+" has an invalid level.");
	}
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
        setTimeout(colourisePage, colouriseTimeout); 
    }
	else
	{
		colouriseInProgress = false;
	}
}

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


function initialiseVocabularyFromIndexedDB(){
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
		}
	}
}

function initialiseVocabulary(){
	if(signedInState=="offline"||signedInState=="signedOut"){
		initialiseVocabularyFromIndexedDB();
	}
	else{
		//TODO instead of this, use the firedb
		initialiseVocabularyFromIndexedDB();
	}
}

function initialiseLessonText(w){
	lessonWordCount = 0;
	let wordCountObj = w.reduce((acc, word) => {
		acc[word] = acc[word] ? acc[word] + 1 : 1;
		return acc;
	}, {});

	lessonWordArray = Object.entries(wordCountObj).map(([word, count]) => {
		lessonWordCount+=count;
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
}

function saveVocabulary(){
	if(signedInState=="offline"||signedInState=="signedOut"){
		saveVocabularyIndexedDB();
	}
	else{
		//TODO instead of this, use the firedb
		saveVocabularyIndexedDB();
	}
	
	p("Vocabulary Saved.");
	vocabularySaveInProgress = false;
}

function saveVocabularyIndexedDB()
{
	let wordsToSave=[];
	let wordsToUpdate = lessonWordArray.filter(wordObj => wordObj.level !== wordObj.initialLevel);
    wordsToUpdate.forEach(wordObj => {
		
		
		let wordText = wordObj.word;
		let level = wordObj.level;
		wordObj.initialLevel = level;
		
		//p("wordObj.level "+wordObj.level);
	//p("wordObj.initialLevel "+wordObj.initialLevel);
	
		p("Updating word in indexedDB: "+wordText);
		switch(level){
			case "known":
				wordsToSave.push({ word: wordText, appearances: 2 });
				break;
			case "learning":
				wordsToSave.push({ word: wordText, appearances: 1 });
				break;
			case "unknown":
				wordsToSave.push({ word: wordText, appearances: 0 });
				break;
			default: console.error("Word "+wordText+" has an invalid level.");
		}		
    });
	putVocabularyIntoIndexedDB(wordsToSave);
}

function putVocabularyIntoIndexedDB(wordsToSave) {
    const transaction = db.transaction(["wordsdb"], "readwrite");
    const objectStore = transaction.objectStore("wordsdb");
    
    wordsToSave.forEach((record) => {
        const request = objectStore.put(record);
        request.onerror = function(event) {
            console.error("Error adding record: ", record, event);
        };
    });

    transaction.oncomplete = function() {
        console.log("All records added successfully!");
    };

    transaction.onerror = function() {
        console.error("Error occurred when adding records:", transaction.error);
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









