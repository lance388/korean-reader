let isDebugMode = true;
var dbfire;
var signedInState="signedOut";
const firebaseConfig = {
		apiKey: "AIzaSyDOZA0ojbWAaeWwx0gL7kenlNm94Fo38BY",
		authDomain: "korean-reader.firebaseapp.com",
		databaseURL: "https://korean-reader.firebaseio.com",
		projectId: "korean-reader",
		storageBucket: "korean-reader.appspot.com",
		messagingSenderId: "410562108352",
		appId: "1:410562108352:web:f42d6c8b329d8e54460625"
};

function p(...messages) {
  if (isDebugMode) {
    console.log(...messages);
  }
}

// Initialize Firebase
//function initializeFirebase() {
//  firebase.initializeApp(firebaseConfig);
//  dbfire = firebase.firestore();
//}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('loading-overlay').style.display = 'flex'; // Show loading overlay
	initialiseCredentials();
	//initialiseCredentials().then(() => {
		//console.log("User's authentication state has been determined.");
	//	initialise();
	//});
	
});

function initialiseCredentials() {
    firebase.initializeApp(firebaseConfig);
    dbfire = firebase.firestore();
    firebase.auth().onAuthStateChanged(user => {
        onAuthStateChanged(user);
    });
}

function initialise(){
    p("Start initialise");
	document.getElementById('loading-overlay').style.display = 'flex'; // Show loading overlay
	
	p("Begin initialise IndexedDB");
    initialiseIndexedDB().then(() => {
        p("Completed initialise Indexed DB");
		initialiseUI();
		saveLastEditMode("");
		loadLessonBlurbs();
		p("Initialisation complete");
        document.getElementById('loading-overlay').style.display = 'none';
    });
}

function loadLessonBlurbs() {
    const lessonCards = document.querySelectorAll('.lesson-card');

    lessonCards.forEach(card => {
        const lessonID = card.getAttribute('data-lesson');

        if (/^custom\d+$/.test(lessonID)) {
            console.log("Custom lesson loading...");

            getCustomLessonFromIndexedDB(lessonID, function(lesson) {
                // Set the description on the card
				if(lesson.text==""){
					card.querySelector('.card-text.description').textContent = "EMPTY";
				}
				else{
					card.querySelector('.card-text.description').textContent = lesson.text;
				}
		
                console.log(`Custom lesson ${lessonID} loaded`);
            });
        } else {
            fetch(`lessons/${lessonID}.json`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Lesson failed to load');
                    }
                    return response.json();
                })
                .then(lesson => {
                    console.log("Premade lesson loading...");
                    card.querySelector('.card-text.description').textContent = lesson.text;
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
    });
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

//initializeFirebase();

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    p("User has logged in.");
	logUser(user);
	displaySigninElements("signedInMode");
  } else {
    if (window.location.protocol === "file:") {
		// Running locally
		displaySigninElements("offlineMode");
	} 
	else
	{
		displaySigninElements("signedOutMode");
	}
  }
});

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



function initialiseUI()
{
	if (window.location.protocol === "file:") {
		// Running locally
		displaySigninElements("offlineMode");
		p("User is running the website locally");
	} 
	
	window.addEventListener('online', function(e) {
		displaySigninElements("signedOutMode");
	});

	window.addEventListener('offline', function(e) {
		displaySigninElements("offlineMode");
		p("user is offline");
	});
	
	
	  // Get all the lesson links
  const lessonLinks = document.querySelectorAll('.lesson-link');

  // Add a click event listener to each lesson link
  lessonLinks.forEach(lessonLink => {
    lessonLink.addEventListener('click', function(event) {
      // Prevent the default link click behavior
      event.preventDefault();

      // Get the lesson name from the data-lesson attribute of the clicked card
      const lessonID = this.querySelector('.lesson-card').dataset.lesson;

      // Store the lesson name in sessionStorage
      sessionStorage.setItem('lessonID', lessonID);
	  
	  //p('Stored lessonID:', sessionStorage.getItem('lessonID'));
	  //alert('Stored lessonID:'+ sessionStorage.getItem('lessonID')+' lessonID: '+lessonID);
      // Navigate to the new page
      window.location.href = this.href;
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


