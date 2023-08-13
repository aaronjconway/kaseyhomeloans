console.log('version 1')

/*  - do we need two observers?
 *  - do we need mutobs for formatting at all?
 *  why not event listenr on the slider instead.
 *  - should we observe on css:display changes or if visible
 *  - consolidate the modal and modalWrapper
 */

const formWrapper = document.getElementById("form-steps-wrapper");

document.getElementById("submit_button").disabled = true;

// formattting of numbers and rate
const observer = new MutationObserver(function(mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.target.getAttribute("formatter") === "money") {
      const newValue = Number(mutation.target.textContent).toLocaleString(
        "en-US",
        { style: "currency", currency: "USD", maximumFractionDigits: 0 }
      );

      observer.disconnect();

      if (newValue == "$1,500,000") {
        mutation.target.textContent = newValue + "+";
      } else {
        mutation.target.textContent = newValue;
      }

      observer.observe(formWrapper, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    if (mutation.target.getAttribute("formatter") === "rate") {
      const newRateValue = mutation.target.textContent + "%";

      observer.disconnect();

      if (newRateValue == "8.0%") {
        mutation.target.textContent = newRateValue + "+";
      } else {
        mutation.target.textContent = newRateValue;
      }
      observer.observe(formWrapper, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }
});

observer.observe(formWrapper, { childList: true, subtree: true, characterData: true });

//get all the steps
const formSteps = formWrapper.querySelectorAll(".form-step");

//initial step state. helpful for first setp
var previousStep = "";

const formObserver = new MutationObserver(function(mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === "attributes" && mutation.attributeName === "style") {
      // get the heading of the form step
      const visibleStepHeading = mutation.target.querySelector(
        ".step-content .form-content-heading"
      ).textContent;

      const visibleStep = mutation.target;

      // if not on the first page and we've changed form steps
      if (previousStep !== visibleStep && previousStep !== "") {

        if (visibleStep.id == "final") {
          const inputs = document.querySelectorAll("input");

          inputs.forEach((input) => {
            if (input.hasAttribute("required")) {
              input.removeAttribute("required");
            }
          });
        }
      }

      previousStep = visibleStep;
    }
  }
});

// Configure and start observing each form step for style attribute changes
// We are wathcing for display:none changes to figure out which step we're on
const config = { attributes: true, attributeFilter: ["style"] };

//why not observe just the whole form. do we need to observe each step?
formSteps.forEach((formStep) => {
  formObserver.observe(formStep, config);
});

//status message for the phone verification
const statusSpan = document.getElementById("status");

//status message when on the modal popup for phone verificaiton
const modalStatusSpan = document.getElementById("modal-status");

//initial status
showStatus("Please verify your phone...");

function showModalStatus(message, options = { color: "gray" }) {
  modalStatusSpan.style.color = options.color;
  modalStatusSpan.textContent = message;
}

function showStatus(message, options = { color: "gray" }) {
  statusSpan.style.color = options.color;
  statusSpan.textContent = message;
}

function showError(error) {
  showStatus(error, { color: "#a94442" });
}

function clearStatus() {
  statusSpan.textContent = "";
  modalStatusSpan.textContent = "";
}

//close privacy modal
const privacyCloseButton = document.getElementById("privacy-close");
privacyCloseButton.addEventListener("click", () => {
  document.getElementById("privacy-modal").style.display = "none";
});

//open privacy modal
let privacyOpenButton = document.getElementById("privacy-button");
privacyOpenButton.addEventListener("click", () => {
  document.getElementById("privacy-modal").style.display = "block";
});

//open license modal
let licenseCloseButton = document.getElementById("license-close");
licenseCloseButton.addEventListener("click", () => {
  document.getElementById("license-modal").style.display = "none";
});

//close license modal
let licenseOpenButton = document.getElementById("license-button");
licenseOpenButton.addEventListener("click", () => {
  document.getElementById("license-modal").style.display = "block";
});

//modal div. TODO: refactor. why are there two
const modal = document.getElementById("otp-modal");
const modalwrapper = document.getElementById("otp-wrapper");

async function handleSendCode() {

  //get and add disabled class
  document.getElementById("send-code").classList.add('disabled')
  document.getElementById("send-code").style.pointerEvents = 'none'

  const originalText = document.getElementById("send-code").textContent

  let remainingTime = 10;
  showError(`Is ${to} a valid number? Please wait ${remainingTime} seconds to try again`)

  const timer = setInterval(() => {
    remainingTime--;
    showError(`Is ${to} a valid number? Please wait ${remainingTime} seconds to try again`)

    if (remainingTime === 0) {
      clearStatus()
      clearInterval(timer);

      //remove disabled class
      document.getElementById("send-code").classList.remove('disabled')
      document.getElementById("send-code").style.pointerEvents = 'auto'

      //update the remainingTime
      showStatus(`Please try again`)

    }
  }, 1000);
}

//function to disabled button when phone is bad
function handleVerifyCode() {

  //disable class and turn off click
  document.getElementById("check-code").classList.add('disabled')
  document.getElementById("check-code").style.pointerEvents = 'none'

  const originalText = document.getElementById("check-code").textContent

  let remainingTime = 10;

  //set status to ask if correct
  showModalStatus(`Is ${code.value} correct? Please wait ${remainingTime} seconds to try again`)

  const timer = setInterval(() => {

    remainingTime--;

    //update the remainingTime
    showModalStatus(`Is ${to} a valid number? Please wait ${remainingTime} seconds to try again`)

    if (remainingTime === 0) {
      clearInterval(timer);

      //re-enable
      document.getElementById("check-code").classList.remove('disabled')
      document.getElementById("check-code").style.pointerEvents = 'auto'

      //update the remainingTime
      showModalStatus(`Please try again`)
    }
  }, 1000);
}
//phone number "to"; for twillio
var to;


//sends the otp
async function sendOtp(event) {
  event.preventDefault();

  showStatus("Sending verification code...");
  to = formatPhoneTwilio(document.getElementById("phone_number").value);

  const data = new URLSearchParams();

  data.append("channel", "sms");
  data.append("locale", "en");
  data.append("to", to);

  if (data.get("to").length < 12) {
    showError("please enter a phone number");
    return;
  }

  try {
    const response = await fetch(
      "https://verify-7293-cboql9.twil.io/start-verify",
      {
        method: "POST",
        body: data,
      }
    );

    const json = await response.json();

    if (response.status == 429) {
      clearStatus();

      modal.style.display = "block";

      showModalStatus(
        `You have attempted to verify '${to}' too many times. If you received a code, enter it in the form. Otherwise, please wait 10 minutes and try again.`,
        { color: "#a94442" }
      );

    } else if (response.status >= 400) {

      clearStatus();

      console.log(json.error);

      handleSendCode()


    } else {
      modal.style.display = "block";
      modalwrapper.style.display = "block";

      if (json.success) {
        showStatus(`Sent verification code to ${to}`);
      } else {
        console.log(json.error);
        showError("Is " + to + " a valid number?");
        handleSendCode()
      }
    }
  } catch (error) {
    console.error(error);
    showError(`Something went wrong while sending code to ${to}.`);
  }
}

document
  .getElementById("send-code")
  .addEventListener("click", (event) => sendOtp(event));

async function checkOtp(event) {

  event.preventDefault();
  let code = document.getElementById("code");

  showModalStatus(`Checking code ${code.value}...`);

  const data = new URLSearchParams();
  data.append("to", to);
  data.append("code", code.value);

  try {
    const response = await fetch(
      "https://verify-7293-cboql9.twil.io/check-verify",
      {
        method: "POST",
        body: data,
      }
    );

    const json = await response.json();

    if (json.success) {
      showModalStatus("Verification success! Redirecting...", {
        color: "green",
      });
      code.value = "";

      //show success and auto close
      setTimeout(function() {
        modal.style.display = "none";
        modalwrapper.style.display = "none";
        document.getElementById("send-code").style.display = "none";
        document.getElementById("phone_number").classList.add("valid");
        document.getElementById("phone_number").disabled = true;
        clearStatus();
      }, 2000);
    } else {
      showModalStatus('incorrect token')
      handleVerifyCode()
    }
  } catch (error) {
    console.error(error);
    showModalStatus("Something went wrong!");
    handleVerifyCode()
    code.value = "";
  }
}

//check verification code button
let checkCode = document.getElementById("check-code");
checkCode.addEventListener("click", (event) => checkOtp(event));

//close modal
let closeButton = document.getElementById("close");
closeButton.addEventListener("click", () => {
  modal.style.display = "none";
  showModalStatus("");
});

//get phone number
var phoneNumberInput = document.getElementById("phone_number");

//format phone number
phoneNumberInput.addEventListener("input", function() {
  const formattedPhoneNumber = formatPhoneDisplay(phoneNumberInput.value);
  phoneNumberInput.value = formattedPhoneNumber;
});

//format phone number displayed to user to (xxx)-xxx-xxx
function formatPhoneDisplay(input) {
  input = input.replace(/\D/g, "");
  var size = input.length;
  if (size > 0) input = "(" + input;
  if (size > 3) input = input.slice(0, 4) + ") " + input.slice(4, 11);
  if (size > 6) input = input.slice(0, 9) + "-" + input.slice(9);
  return input;
}

//format the phone to send to twillio with +1 and as a string
function formatPhoneTwilio(input) {

  //remove non digis and add country code
  const phoneDigits = input.replace(/\D/g, "");
  const formattedNumber = "+1" + phoneDigits;
  return formattedNumber;
}

var emailInput = document.getElementById("email");


//listen for input events and wait to format for 1.5s
emailInput.addEventListener("input", function() {
  emailInput.classList.remove("invalid", "valid");

  setTimeout(() => {
    const email = emailInput.value;

    if (isEmailValid(email)) {

      // add valid class
      emailInput.classList.add("valid");

    } else if (email == "") {

      //remove all classes
      emailInput.classList.remove("invalid", "valid");
    } else {

      //invalid class
      emailInput.classList.add("invalid");
    }
  }, 1500);
});

function isEmailValid(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

//set the indicator length
var indicators = document.querySelectorAll('[data-form="progress-indicator"]');
indicators.forEach((item) => {
  item.style.minWidth = ((1 / indicators.length) * 100).toString() + "%";
});

// Webflow.push(function() {

//   $('form').submit(function() {
//     if (phoneNumberInput.classList.contains('valid') && emailInput.classList.contains('valid')) {

//       //todo: add privacy policy check
//       return;

//     } else {
//       showError('Please complete both phone and email.')
//       return false
//     }

//   });
// });

const submitBtn = document.getElementById('submit_button')

//reset on reload
window.onbeforeunload = function() {
	const form = $("[id^='wf-form']")
  form.reset();
}


var Webflow = Webflow || [];
Webflow.push(function() {

  $(document).off('submit')

	// display error message
	function displayError(message) {
		hideLoading();
		failureMessage.innerText = message;
		failureMessage.style.display = 'block';
	}

	// hiding the loading indicator
	function hideLoading() {
		showForm();
		successMessage.style.display = 'none';
	}

	// hide the form
	function hideForm() {
		form.style.display = 'none';
	}

	// show the loading indicator
	function showLoading() {
		hideForm();
		successMessage.style.display = 'block';
	}

	// show the form
	function showForm() {
		form.style.display = 'block';
	}

	// listen for xhr events
	function addListeners(xhr) {
		xhr.addEventListener('loadstart', showLoading);
	}

	// add xhr settings
	function addSettings(xhr) {
		xhr.timeout = requestTimeout;
	}

	// triggered form submit 
	function triggerSubmit(event) {

		event.preventDefault();

		// setup + send xhr request
		let formData = new FormData(event.target);
		let xhr = new XMLHttpRequest();

    if (phoneNumberInput.classList.contains('valid') && emailInput.classList.contains('valid')) {



      // original
      // xhr.open('POST', event.srcElement.action);

      //testing
      xhr.open('POST', "https://eoyf4snr26od3cm.m.pipedream.net");

      addListeners(xhr);
      addSettings(xhr);
      xhr.send(formData);

      // capture xhr response
      xhr.onload = function() {
        if (xhr.status === 302) {
          let data = JSON.parse(xhr.responseText);
          console.log(data)
          window.location.assign(event.srcElement.dataset.redirect + data.slug);
        } else {
          displayError(errorMessage);
        }
      }

      // capture xhr request timeout
      xhr.ontimeout = function() {
        displayError(errorMessageTimedOut);
      }

    } else {
      showError('Please complete both phone and email.')
      return false
    }

	}

  //check for the form. 
	const form = $("[id^='wf-form']")

	// set the Webflow Error Message Div Block ID to 'error-message'
	let failureMessage = document.getElementById('error-message');

	// set the Webflow Success Message Div Block ID to 'success-message'
	let successMessage = document.getElementById('success-message');

	// set request timeout in milliseconds (1000ms = 1second)
	let requestTimeout = 10000;

	// error messages
	let errorMessageTimedOut = 'Oops! Seems this timed out. Please try again.';
	let errorMessage = 'Oops! Something went wrong. Please try again.';

	// capture form submit
	form.addEventListener('submit', triggerSubmit);

});