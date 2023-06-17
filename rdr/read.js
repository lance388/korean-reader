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

function initialize()
{
	initializeFirebase();
	initializeUI();
}

// Initialize Firebase
function initializeFirebase() {
  firebase.initializeApp(firebaseConfig);
  dbfire = firebase.firestore();
}



firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log("User has logged in.");
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
		  console.log("toggle sign in 2");
          var errorCode = error.code;
          var errorMessage = error.message;
          // [START_EXCLUDE]
          if (errorCode === 'auth/wrong-password') {
            alert('Wrong password.');
          } else {
            alert(errorMessage);
          }
          console.log(error);
		  console.log("Signed in with email");
		  showSigninElements(false);
          // [END_EXCLUDE]
        });
        // [END authwithemail]
      }
    }

	function onSignIn(googleUser) {
		console.log("at sign in");
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
			  console.log("Signed in with Google");
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
		console.log("User logged in");
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
  // This is just a placeholder. You would replace this with actual logic to load the text.
  console.log("Loading lesson:", lessonName);
}



