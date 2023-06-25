var isDebugMode = true;
var lessonLanguage = "ko";
var dbfire;
const wordsPerPage = 200;
const pagesToLookAheadBehind = 2;
var scrollDebounceTimer;
const scrollDebounceTimeout = 100;
const colouriseTimeout = 100;
var pageMax=0;
var colourisePending = false;
var colouriseInProgress = false;
var signedInState = "signedOut";
var db;

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

initialize();

function p(...messages) {
  if (isDebugMode) {
    console.log(...messages);
  }
}

function initialize()
{
	initializeFirebase();
	initializeUI();
	initializeIndexedDB();
	initializeTextSaving();
}

function initializeTextSaving(){
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
			// This is where you'd put your saving code. For now, just log the text.
			p("text saved");

			// Optionally, you can use IndexedDB or any other storage mechanism to store the data.
			// For example: saveToIndexedDB(textarea.value);
			
			// Reset saveTimeout so we know no save is scheduled
			saveTimeout = null;
		}, saveDelay);
	});
}

// Initialize Firebase
function initializeFirebase() {
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

function initializeUI(){
	
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
                    colourise(); // initiate the colorising operation
            }
			
		}, scrollDebounceTimeout);
	});
	
	document.addEventListener('DOMContentLoaded', function() {
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
		  loadLesson(sessionStorage.getItem('lessonName'));


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
	});
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
				document.getElementById("loggedInState").innerText = "Logged in as "+firebase.auth().currentUser;
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




function loadLesson(lessonName) {
  // Load lesson text based on lessonName
  p("Loading lesson:", lessonName);

  fetch(`lessons/${lessonName}.json`)  // use backticks here
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(lesson => {
        // Now you can work with your lesson object
        processLessonJson(lesson);
    })
    .catch(error => console.error('Error:', error));
}

function processLessonJson(json){
	
	if (/^custom\d+$/.test(json.type)) {
		initCustomLesson(json.title);
	}
	else{
		initPremadeLesson(json.title, json.text);
		
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

function initCustomLesson(title){
	document.getElementById('nav-clear-tab').disabled=false;
	//protectText = false;
	//lessonType = "custom";
	document.getElementById('textarea-navbar-title').innerText = title;
	
	activateEditTab();
}

function loadTextIntoLearnTab(text, language) {
    const learnTextElement = document.getElementById('learnText');
    let chunks = text.split(/(\s+|\n+)/).flatMap((chunk) => {
        if(/\n+/.test(chunk)) {
            // If the chunk is a newline, return a <br> element
            return '<span class="non-text"><br><br></span>';
        } else if (/\s+/.test(chunk)) {
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
    p(`The word "${word}" was clicked`);
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

function colourise() {
    if (colourisePending) {
		
		const page = document.querySelector('.page.active:not(.colourised)');
		
		if(page)
		{
			const clickableWords = page.querySelectorAll('span.clickable-word');
			clickableWords.forEach(word => {
				word.classList.add('unknown');
			});
			page.classList.add('colourised');
		}
		else
		{
			colourisePending = false;
			colouriseInProgress = false;
			return;
		}
		colouriseInProgress = false;
        setTimeout(colourise, colouriseTimeout); // this delays the next call for 100ms, adjust to your needs
    }
	else
	{
		colouriseInProgress = false;
	}
}

function initializeIndexedDB(){
	if (!window.indexedDB) {
		alert("Your browser doesn't support a stable version of IndexedDB");
		p("Your browser doesn't support a stable version of IndexedDB");
	}
	else{			
		var request = indexedDB.open("wordsdb",3);
		request.onupgradeneeded = function() {
			  db = request.result;
			  var store = db.createObjectStore("wordsdb", {keyPath: "word"});
			  var appearancesIndex = store.createIndex("by_appearance", "appearance");
		};
		request.onerror = function(event) {
			p("Database error: " + event.target.errorCode);
		};
		request.onsuccess = function() {
			  db = request.result;
			  initializeVocabulary();
		};
	}
}

function initializeVocabularyFromIndexedDB(){
	var arrLearning = [];
	var arrKnown = [];
	var arrUnknown = [];
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
						
				if(!w.includes("$"))
				{
					var remainder = a%3;
							
					if(remainder==0){
						arrUnknown.push(w);
					}
					else if(remainder==1){
						arrLearning.push(w);
					}
					else if(remainder==2){
						arrKnown.push(w);
					}
				}
			}
			p(arrUnknown);
			p(arrLearning);
			p(arrKnown);
		}
	}
}

function initializeVocabulary(){
	if(signedInState=="offline"||"signedOut")
	{
		//TODO clear vocabulary first
		initializeVocabularyFromIndexedDB();
	}
}




