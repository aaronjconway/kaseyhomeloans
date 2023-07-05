console.log("v25");

/*  - do we need two observers?
 *  - do we need mutobs for formatting at all?
 *  why not event listenr on the slider instead.
 *  - should we observe on css:display changes or if visible
 *  - consolidate the modal and modalWrapper
 */

// select the forms stuff
const form = document.getElementById("form-steps-wrapper");

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

      observer.observe(form, {
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
      observer.observe(form, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }
});

observer.observe(form, { childList: true, subtree: true, characterData: true });

//get all the steps
const formSteps = form.querySelectorAll(".form-step");

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
        console.log(visibleStepHeading);

        if (visibleStep.id == "final") {
          console.log("were on the final step");
          const inputs = document.querySelectorAll("input");

          inputs.forEach((input) => {
            if (input.hasAttribute("required")) {
              console.log("clearing input: ", input);
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
  console.error(error);
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

//modal div. refactor
const modal = document.getElementById("otp-modal");
const modalwrapper = document.getElementById("otp-wrapper");

//phone number "to"; for twillio
var to;



async function sendOtp(event) {
  event.preventDefault();

  // the otp pops up. Move this message to the otp page or don't need
  showStatus("Sending verification code...");

  //get phone number and 
  to = formatPhoneTwilio(document.getElementById("phone_number").value);

  const data = new URLSearchParams();
  data.append("channel", "sms");
  data.append("locale", "en");
  data.append("to", to);

  // check length of phone, 12 becuase +1, before sending request
  if (data.get("to").length < 12) {
    showStatus("please enter a valid number");
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
      document.getElementById('send-code').disabled = true
      let seconds = 10;
      const interval = setInterval(() => {
        showError("Is " + to + `a valid number? Please wait ${seconds} seconds.`);
        seconds--;

        if (seconds < 0) {
          document.getElementById('send-code').disabled = false
          clearInterval(interval);
        }
      }, 1000);

    } else {
      modal.style.display = "block";
      modalwrapper.style.display = "block";
      if (json.success) {
        showStatus(`Sent verification code to ${to}`);
      } else {
        console.log(json.error);
        showError("Is " + to + " a valid number?");
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
    }
  } catch (error) {
    console.error(error);
    showModalStatus("Something went wrong!");
    code.value = "";
  }
}

//check verificaiton code button
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

emailInput.addEventListener("input", function() {
  emailInput.classList.remove("invalid", "valid");

  //wait 1sec till adding invalid class while inputting
  setTimeout(() => {
    const email = emailInput.value;

    if (isEmailValid(email)) {

      // add valid class
      emailInput.classList.add("valid");

    } else if (email == "") {

      //remove all classes
      emailInput.classList.remove("invalid", "valid");
    } else {

      //invalid clas
      emailInput.classList.add("invalid");
    }
  }, 1000);
});

//regex for checking basic email validity
function isEmailValid(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

var indicators = document.querySelectorAll('[data-form="progress-indicator"]');
indicators.forEach((item) => {
  item.style.minWidth = ((1 / indicators.length) * 100).toString() + "%";
});

const submitBtn = document.getElementById('submit_button')

submitBtn.addEventListener('submit', (event) => {
  if (!emailInput.classList.contains('valid')) {
    event.preventDefault()
    showStatus('Please fill in both email and phone')
  }
})


