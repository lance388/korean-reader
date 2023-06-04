
	var firebaseConfig = {
		apiKey: "AIzaSyDOZA0ojbWAaeWwx0gL7kenlNm94Fo38BY",
		authDomain: "korean-reader.firebaseapp.com",
		databaseURL: "https://korean-reader.firebaseio.com",
		projectId: "korean-reader",
		storageBucket: "korean-reader.appspot.com",
		messagingSenderId: "410562108352",
		appId: "1:410562108352:web:f42d6c8b329d8e54460625"
	 };

	firebase.initializeApp(firebaseConfig);
	initialize();
		
	window.handleCredentialResponse = (response) => {
		onSignIn(); 
	}
	
	function initialize()
	{
		initializeFireDB();
	}
	
	function toggleSignIn() {
      if (firebase.auth().currentUser) {
        // [START signout]
		handleSignOut();
        //firebase.auth().signOut();
		ShowSigninElements(true);
        // [END signout]
      } else {
        var email = document.getElementById('email').value;
        var password = document.getElementById('password').value;
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
          var errorCode = error.code;
          var errorMessage = error.message;
          // [START_EXCLUDE]
          if (errorCode === 'auth/wrong-password') {
            alert('Wrong password.');
          } else {
            alert(errorMessage);
          }
          console.log(error);
          document.getElementById('quickstart-sign-in').disabled = false;
          // [END_EXCLUDE]
        });
        // [END authwithemail]
		ShowSigninElements(false);
      }
    }

    /**
     * Handles the sign up button press.
     */
    function handleSignUp() {
      var email = document.getElementById('email').value;
      var password = document.getElementById('password').value;
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
      firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // [START_EXCLUDE]
        if (errorCode == 'auth/weak-password') {
          alert('The password is too weak.');
        } else {
          alert(errorMessage);
        }
        console.log(error);
        // [END_EXCLUDE]
      });
	  
	  sendEmailVerification();
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
      var email = document.getElementById('email').value;
      // [START sendpasswordemail]
      firebase.auth().sendPasswordResetEmail(email).then(function() {
        // Password Reset Email Sent!
        // [START_EXCLUDE]
        alert('Password Reset Email Sent!');
        // [END_EXCLUDE]
      }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // [START_EXCLUDE]
        if (errorCode == 'auth/invalid-email') {
          alert(errorMessage);
        } else if (errorCode == 'auth/user-not-found') {
          alert(errorMessage);
        }
        console.log(error);
        // [END_EXCLUDE]
      });
      // [END sendpasswordemail];
    }
	
	function initializeFireDB()
	{
		dbfire = firebase.firestore();
		firebase.auth().onAuthStateChanged(function(user) {
			if (user) {
				var displayName = user.displayName;	
				var email = user.email;
				var emailVerified = user.emailVerified;
				var photoURL = user.photoURL;
				var isAnonymous = user.isAnonymous;
				var uid = user.uid;
				var providerData = user.providerData;
			} else {
				
			}
		});
		document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);
		document.getElementById('quickstart-sign-up').addEventListener('click', handleSignUp, false);
		document.getElementById('quickstart-password-reset').addEventListener('click', sendPasswordReset, false);  
	}
	
	function onSignIn(googleUser) {
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
			  
			  ShowSigninElements(false);
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
		  ShowSigninElements(true);
		}).catch((error) => {
		  // An error happened.
		});
	}

	function ShowSigninElements(show)
	{
		if(show)
		{
			document.getElementById("email").style.display = 'block';
			document.getElementById("password").style.display = 'block';
			document.getElementById("quickstart-sign-up").style.display = 'block';
			document.getElementById("quickstart-password-reset").style.display = 'block';
			document.getElementById("fireSigninText").style.display = 'block';
			document.getElementById("googleSignin").style.display = 'block';
			document.getElementById("googleSigninText").style.display = 'block';		
		}
		else
		{
			document.getElementById("email").style.display = 'none'; 
			document.getElementById("password").style.display = 'none'; 
			document.getElementById("quickstart-sign-up").style.display = 'none'; 
			document.getElementById("quickstart-password-reset").style.display = 'none'; 
			document.getElementById("fireSigninText").style.display = 'none'; 
			document.getElementById("googleSignin").style.display = 'none'; 
			document.getElementById("googleSigninText").style.display = 'none';
			//
		}
	}



