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

// Initialize Firebase
function initializeFirebase() {
  firebase.initializeApp(firebaseConfig);
  dbfire = firebase.firestore();
}

initializeFirebase();

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

  // Get all the lesson links
  const lessonLinks = document.querySelectorAll('.lesson-link');

  // Add a click event listener to each lesson link
  lessonLinks.forEach(lessonLink => {
    lessonLink.addEventListener('click', function(event) {
      // Prevent the default link click behavior
      event.preventDefault();

      // Get the lesson name from the data-lesson attribute of the clicked card
      const lessonName = this.querySelector('.lesson-card').dataset.lesson;

		console.log('Setting lessonName in sessionStorage:', lessonName);

      // Store the lesson name in sessionStorage
      sessionStorage.setItem('lessonName', lessonName);
	  
	  console.log('Stored lessonName:', sessionStorage.getItem('lessonName'));

      // Navigate to the new page
      window.location.href = this.href;
    });
  });
