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
var enableVoice;
var voiceSelect;
var voices;
var initialisationComplete = false;
var voiceSelection;
var settingsDebounceTimeout;
var lastScroll;
var learnMode;
const DEFAULT_JUMP_HIGHLIGHT='#5a96e0';
const DEFAULT_UNKNOWN_HIGHLIGHT='#F5A9E1';
const DEFAULT_KNOWN_HIGHLIGHT='#99FF00';
const DEFAULT_LEARNING_HIGHLIGHT='#FFFF66';


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
	lessonLanguage = "korean";
	naverDictionaryLanguage="en";
	vocabularyLearning = new Set();
    vocabularyKnown = new Set();
	document.querySelector('#dictionary-iframe').src = 'https://korean.dict.naver.com/koendict/#/main';
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
	
	initialiseIndexedDB().then(() => {
    p("Completed initialise Indexed DB");
    return initialiseVocabulary();
	}).then(() => {
		p("Completed initialise Vocabulary");
		return initialiseUI();
	}).then(() => {
		p("Completed initialise UI");
		initialiseTextSaving();
		initialiseDataTables();
		return initialiseSettings();
	}).then(() => {
		p("Completed initialise settings");
		return initialiseLesson();
	}).then(() => {
		p("Completed initialise lesson");
		return initialiseLearnMode();
	}).then(() => {
		initialiseScroll();
		document.getElementById('loading-overlay').style.display = 'none';
		initialisationComplete = true;
		p("Initialisation complete");
		updateAndSaveSettings();
	}).catch((error) => {
		console.error("An error occurred:", error);
	});
}

function initialiseScroll(){
	var lastScrollArray = settings.lastScrollArray;
			if(lastScrollArray){
			 var matchingItem = lastScrollArray.find(item => item.id == lessonID);
			if(matchingItem) {
				// if a matching item is found, call the function with its scroll as a parameter
				scrollTo(matchingItem.scroll);
			}
		}
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
                title: lessonID,
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
			//console.log("nav-learn Scroll Top Position:", e.target.scrollTop);
			let visibleSpans = findVisibleSpans();
			setActiveText(visibleSpans.firstVisible,visibleSpans.lastVisible);
			if (!colouriseInProgress) {
                    colouriseInProgress = true;
                    colourisePage();
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
/*
function onNavLearnTabShowBsTab(e) {
    p("Opened learn tab");
	//updateAndSaveSettings();
	//saveLastEditMode("learnMode");
	//currentLearnMode = "learnMode";
				loadTextIntoLearnTab(document.getElementById('editText').innerText,lessonLanguage);
				//document.getElementById('nav-learn').dispatchEvent(new Event('scroll'));
				$('#nav-learn').trigger('scroll');
				
			//	var scrollPosition = $('#editText').scrollTop();
			//	p("edit scroll pos: "+scrollPosition);
			//$('#nav-learn').scrollTop(scrollPosition);
}
*/
/*
function onNavEditTabShowBsTab(e) {
    p("Opened edit tab");
	//updateAndSaveSettings();
	//currentLearnMode = "editMode";
	//saveLastEditMode("editMode");
		//var scrollPosition = $('#nav-learn').scrollTop();
		//p("learn scroll pos: "+scrollPosition);
		//$('#editText').scrollTop(scrollPosition);
}
*/
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

			// insert each node from the temporary div at the cursor position
			while (tempDiv.firstChild) {
				selection.getRangeAt(0).insertNode(tempDiv.firstChild);
			}

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
		case "cn":selectedLanguage="zh";break;
		case "en":selectedLanguage="ko";break;
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
    const loginButton = document.getElementById('login-button');
    const signinStateText = document.getElementById('signin-state-text');

    switch(state)
    {
        case "offlineMode":
            loginButton.style.display = 'none';
            signinStateText.innerText = "Working in offline mode";
            loginButton.innerText = "Sign in";
            break;
        case "signedOutMode":
            loginButton.style.display = '';
            signinStateText.innerText = "Working in signed-out mode";
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
    return new Promise((resolve, reject) => {
        var title = formatTitle(lessonID);
        document.getElementById('textarea-navbar-title').innerText = title;
        $('#current-lesson-title').text(title);
        lessonSavingEnabled=true;
        
        if(signedInState=="offline"||signedInState=="signedOut"){
            getCustomLessonFromIndexedDB(lessonID, function(lesson) {
                if(lesson){
                    const textarea = document.getElementById('learnText');
                    textarea.innerText = lesson.text;
                   // $('#editText').trigger('input');
                    resolve();
                } else {
                    console.log('Could not load custom lesson');
                }
            });
        }
        else{
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
        }
    });
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
	updateWordInWordTable(word,newLevel);
	updateWordInSentencesTable(word,newLevel);
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
            callback(request.result);
        } else {
            console.log("No data record found for the title: " + i + ". Creating new record.");

            var newLesson = {
                id: i,
                title: i, // Update as per your requirement
                text: "" // Update as per your requirement
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
            switch (naverDictionaryLanguage) {
                case "en":
				case "zh":
					document.querySelector('#dictionary-iframe').src = "https://korean.dict.naver.com/ko"+naverDictionaryLanguage+"dict/#/search?query="+pendingDictionaryLookup;
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
                    document.querySelector('#dictionary-iframe').src = "https://dict.naver.com/" + naverDictionaryLanguage + "kodict/#/search?query=" + pendingDictionaryLookup;
                    break;
                default:
                    console.error("Dictionary language not found " + naverDictionaryLanguage);
            }
        }
    }
}


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
        const matchingWord = lessonWordArray.find(function(lessonWord) {
            return lessonWord.word === word;
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

function colourSentences(table){
	
  let currentPageRows = table.rows({ page: 'current' });

	currentPageRows.every(function() {
	  let rowData = this.data();
	  let index = rowData["#"];
	  let thisSentence = sentences.find(item => item.validSentenceIndex === index);
	  let sentenceHtml = thisSentence.sentence;

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
		  sentenceHtml = sentenceHtml.replace(word, wordHtml);
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

function colourWordTable(table) {
    let currentPageRows = table.rows({ page: 'current' });

    currentPageRows.every(function() {
        let rowData = this.data();
		var tempElement = document.createElement('div');
        tempElement.innerHTML = rowData["Word"];

        // Get the text content of the tempElement, which will be the word without any HTML tags
        let word = tempElement.textContent;

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
					return lessonWord.word === word;
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
        if (innerWord == word) {
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
    p("Jumping to " + word);
	
    // Get all .clickable-word elements that contain the word
    var wordElements = $("#learnText .page .clickable-word").filter(function() {
        return $(this).text() === word;
    });

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

        var utterance = new SpeechSynthesisUtterance(word);

        // Get the selected voice from the dropdown
		if(!voiceSelect.selectedOptions){
			return;
		}
        var selectedOption = voiceSelect.selectedOptions[0].value;
        voices.forEach(function(voice) {
            if(voice.name === selectedOption) {
                utterance.voice = voice;
            }
        });

        // Get volume, rate, and pitch from the respective input controls
        var volume = document.getElementById('volume-control').value;
        var rate = document.getElementById('rate-control').value;
        var pitch = document.getElementById('pitch-control').value;

        // Set volume, rate, and pitch for the utterance
        utterance.volume = parseFloat(volume); // Volume value is between 0 and 1
        utterance.rate = parseFloat(rate); // Rate value is between 0.1 and 10
        utterance.pitch = parseFloat(pitch); // Pitch value is between 0 and 2

        // Speak the utterance
        speechSynthesis.speak(utterance);
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

function activateEditMode(){ 
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
    updateAndSaveSettings();
}


function activateLearnMode(){
	console.log("Activate learn mode.");
	learnMode="learn";
	$('#edit-button').removeClass('active');
	loadTextIntoLearnTab(document.getElementById('learnText').innerText,lessonLanguage);
	$('#nav-learn').trigger('scroll');
	$('#learnText').on('contextmenu');
	$("#learnText").attr('contenteditable', 'false');
	updateAndSaveSettings();
}

function toggleEditMode() {
    if ($('#edit-button').hasClass('active')) {
		activateLearnMode();
    } else {
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
	activateLearnMode();
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

function setDictionaryLanguage(lang){
	if(lang!=naverDictionaryLanguage){
		naverDictionaryLanguage=lang;
		if(sidebarTab == "dictionary"){
			handleDictionaryLookup();
		}
	}
}

function initialiseSettings() {
    return getSettings().then(settings => {
        // Assign to a global variable
        window.settings = settings;

         //Log each setting
        for (let key in settings) {
            console.log(`Setting found ${key}: ${settings[key]}`);
        }
    
	
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
        if (voiceSelection) {
            $('#voice-selection').val(voiceSelection);
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
		
		if(settings.font){
			$('#font-selection').val(settings.font);
			$('#learnText').css('font-family', settings.font);
		}

		if(settings.textSize){
			let textSize = settings.textSize;
			$('#text-size').val(textSize);
			$('#learnText').css('font-size', textSize + 'em');
		}
		
		if(settings.dictionaryLanguage){
			$('#dictionary-language-selection').val(settings.dictionaryLanguage);
			setDictionaryLanguage(settings.dictionaryLanguage);
		}


		
		if (settings.theme) {
			setTheme(settings.theme);
		}
		else{
			setTheme(getPreferredTheme());
		}
		
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
			font: $("#font-selection").val(),
			textSize: $("#text-size").val(),
			unknownOpacity: $("#unknown-opacity").val(),
			learningOpacity: $("#learning-opacity").val(),
			knownOpacity: $("#known-opacity").val(),
			jumpOpacity: $("#jump-opacity").val(),
			dictionaryLanguage:$("#dictionary-language-selection").val()
		};

		console.log("Saving settings.");
		// Save settings to the database
		saveSettings(settings);

		// Clear the timeout
		settingsDebounceTimeout = null;
	}, 1000); // Wait for 500ms since the last invocation to actually execute
}