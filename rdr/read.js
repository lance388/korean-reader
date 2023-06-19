let isDebugMode = true;
var dbfire;

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
	initializeSaving();
}

function initializeSaving()
{
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
			p(textarea.value);

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
	showSigninElements(false);
  } else {
    // No user is signed in.
	showSigninElements(true);
  }
});

	function initializeUI()
{
	//todo
}



window.handleCredentialResponse = (response) => {
	onSignIn(); 
}
	
	function toggleSignIn() {
      if (firebase.auth().currentUser) {
        // [START signout]
		handleSignOut();
        //firebase.auth().signOut();
		showSigninElements(true);
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
		  showSigninElements(false);
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
			  showSigninElements(false);
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
		  showSigninElements(true);
		}).catch((error) => {
		  // An error happened.
		});
	}

function showSigninElements(show)
	{
		if(show)
		{
			//todo
		}
		else
		{
			//todo
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


document.addEventListener('DOMContentLoaded', function() {
  var sidebar = document.getElementById('sidebar');
  var sidebarContainer = document.querySelector('.sidebar-container');
  var textareaContainer = document.querySelector('.textarea-container');
  var textareaFullscreenButton = document.getElementById('textareaFullscreenButton');
  var sidebarFullscreenButton = document.getElementById('sideBarFullscreenButton');
  
	
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
  
  // Get the lessonName from sessionStorage
  const lessonName = sessionStorage.getItem('lessonName');

  // Now you can use lessonName to load the appropriate lesson text
  // Let's assume you have a function called loadLesson that takes a lesson name and loads the text
  loadLesson(lessonName);
});

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

function processLessonJson(json)
{
	
	if (/^custom\d+$/.test(json.type)) {
		loadCustomLesson(json.title);
	}
	else{
		loadPremadeLesson(json.title, json.text);
		
	}
	
}

function loadPremadeLesson(title, text){
	if (!document.getElementById('nav-edit-tab').classList.contains('active')) {
		// Set the 'Edit' tab as the active tab
		document.getElementById('nav-edit-tab').classList.add('active');
		document.getElementById('nav-edit').classList.add('show', 'active');

		// Remove the 'active' class from the 'Learn' tab
		document.getElementById('nav-learn-tab').classList.remove('active');
		document.getElementById('nav-learn').classList.remove('show', 'active');
	}
	
	document.getElementById('textarea-navbar-title').innerText = title;
	
	//load text into edit mode text area
	document.getElementById('editText').value = text;
}

function loadCustomLesson(title)
{
	if (!document.getElementById('nav-edit-tab').classList.contains('active')) {
		// Set the 'Edit' tab as the active tab
		document.getElementById('nav-edit-tab').classList.add('active');
		document.getElementById('nav-edit').classList.add('show', 'active');

		// Remove the 'active' class from the 'Learn' tab
		document.getElementById('nav-learn-tab').classList.remove('active');
		document.getElementById('nav-learn').classList.remove('show', 'active');
	}
	
	document.getElementById('textarea-navbar-title').innerText = title;
	
}





