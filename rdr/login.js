var dbfire;
let isDebugMode = true;
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
    showSigninElements(false);
	
  } else {
    // No user is signed in.;
    showSigninElements(true);
  }
});
	
	
function initializeUI()
{
		document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);
		document.getElementById('quickstart-sign-up').addEventListener('click', handleSignUp, false);
		document.getElementById('quickstart-password-reset').addEventListener('click', sendPasswordReset, false); 
		document.getElementById('fireSignupToggleText').addEventListener('click', function() {
			document.querySelector('.login-container').style.display = 'none';
			document.querySelector('.signup-container').style.display = 'block';
		});
		document.getElementById('fireSigninToggleText').addEventListener('click', function() {
			document.querySelector('.login-container').style.display = 'block';
			document.querySelector('.signup-container').style.display = 'none';
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
		  
		  window.location.href = 'content.html';
          // [END_EXCLUDE]
        });
        // [END authwithemail]
      }
    }

    /**
     * Handles the sign up button press.
     */
    function handleSignUp() {
      var email = document.getElementById('signup-email').value;
      var password = document.getElementById('signup-password').value;
      if (email.length < 4) {
        alert('Please enter an email address.');
        return;
      }
      if (password.length < 4) {
        alert('Please enter a password.');
        return;
      }
      // Create user with email and pass.
      // [START createwithemail]
    firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // The user has been created successfully, now you can switch the view
      // and send the verification email
      document.querySelector('.login-container').style.display = 'block';
      document.querySelector('.signup-container').style.display = 'none';
      sendEmailVerification();
    })
    .catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // [START_EXCLUDE]
      if (errorCode == 'auth/weak-password') {
        alert('The password is too weak.');
      } else {
        alert(errorMessage);
      }
      p(error);
      return;
      // [END_EXCLUDE]
    });
      // [END createwithemail]
    }

    /**
     * Sends an email verification to the user.
     */
    function sendEmailVerification() {
      // [START sendemailverification]
      firebase.auth().currentUser.sendEmailVerification().then(function() {
        // Email Verification sent!
        // [START_EXCLUDE]
        alert('Email Verification Sent!');
        // [END_EXCLUDE]
      });
      // [END sendemailverification]
    }

function sendPasswordReset() {
  var email = document.getElementById('signin-email').value;
  firebase.auth().sendPasswordResetEmail(email).then(function() {
    alert('If there is an account associated with this email, password reset instructions will be sent.');
  }).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    if (errorCode == 'auth/invalid-email') {
      alert(errorMessage);
    } else if (errorCode == 'auth/user-not-found') {
      alert(errorMessage);
    }
   p(error);
  });
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
			document.getElementById("signin-email").style.display = 'block';
			document.getElementById("signin-password").style.display = 'block';
			document.getElementById("quickstart-sign-up").style.display = 'block';
			document.getElementById("quickstart-password-reset").style.display = 'block';
			document.getElementById("fireSigninText").style.display = 'block';
			document.getElementById("googleSignin").style.display = 'block';
			document.getElementById('quickstart-sign-in').textContent = 'Sign in';
			document.getElementById('fireSignupToggleText').style.display = 'block';
		}
		else
		{
			document.getElementById("signin-email").style.display = 'none'; 
			document.getElementById("signin-password").style.display = 'none'; 
			document.getElementById("quickstart-sign-up").style.display = 'none'; 
			document.getElementById("quickstart-password-reset").style.display = 'none'; 
			document.getElementById("fireSigninText").style.display = 'none'; 
			document.getElementById("googleSignin").style.display = 'none'; 
			document.getElementById('quickstart-sign-in').textContent = 'Sign out';	
			document.getElementById('fireSignupToggleText').style.display = 'none';
			var user = firebase.auth().currentUser;
			if(user)
			{
				logUser(user);
			}
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
		p("Error writing document: ", error);
	});
}





