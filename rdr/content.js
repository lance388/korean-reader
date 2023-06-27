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

function p(...messages) {
  if (isDebugMode) {
    console.log(...messages);
  }
}

// Initialize Firebase
function initializeFirebase() {
  firebase.initializeApp(firebaseConfig);
  dbfire = firebase.firestore();
}

initializeFirebase();

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

function initializeUI()
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
}

initializeUI();

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
	  
	  p('Stored lessonID:', sessionStorage.getItem('lessonID'));

      // Navigate to the new page
      window.location.href = this.href;
    });
  });
