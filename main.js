console.log("v21");

console.log;

//disable submit till valid otp
document.getElementById("submit_button").classList.add("off");
document.getElementById("submit_button").disabled = true;

// Select the target node
const form = document.getElementById("form-steps-wrapper");

// Create a new Mutation Observer instance to do formatting of numbers and rates
const observer = new MutationObserver(function (mutationsList) {
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

//mutation observer to detemrine which form step is visible.
const formSteps = form.querySelectorAll(".form-step");

var previousStep = "";
const formObserver = new MutationObserver(function (mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === "attributes" && mutation.attributeName === "style") {
      const visibleStepHeading = mutation.target.querySelector(
        ".step-content .form-content-heading"
      ).textContent;

      const visibleStep = mutation.target;
      //if we are on a new form adn not the first page.
      // have to do this since sometimes it shows mutliple updates.
      if (previousStep !== visibleStep && previousStep !== "") {
        console.log(visibleStepHeading);
        /* on the final form step. clear any required fields
                TODO: Temporary becuase we need a way of submitting the form
                regardless of user path in the logic.

                Yes I know this is very dumb.I don't know what I'md doing.

                 */
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
const config = { attributes: true, attributeFilter: ["style"] };
formSteps.forEach((formStep) => {
  formObserver.observe(formStep, config);
});

const statusSpan = document.getElementById("status");
const modalStatusSpan = document.getElementById("modal-status");
showStatus("Please verify your phone...");

function showModalStatus(message, options = { color: "gray" }) {
  modalStatusSpan.style.color = options.color;
  modalStatusSpan.textContent = message;
}

function showError(error) {
  console.error(error);
  showStatus(error, { color: "#a94442" });
}

function showStatus(message, options = { color: "gray" }) {
  statusSpan.style.color = options.color;
  statusSpan.textContent = message;
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

//set initial sent time, 0 becuase ti hasn't been sent
let prevotpSentTime = 0;

const modal = document.getElementById("otp-modal");
const modalwrapper = document.getElementById("otp-wrapper");
var to;

async function sendOtp(event) {
  event.preventDefault();

  showStatus("Sending verification code...");

  to = remove_phone_format(document.getElementById("phone_number").value);

  const data = new URLSearchParams();
  data.append("channel", "sms");
  data.append("locale", "en");
  data.append("to", to);

  // check length of phone, 12 becuase +1, before sending request
  if (data.get("to").length < 12) {
    showStatus("This doesn't look like a valid number.");
    return;
  }

  try {
    //set time of sent
    prevotpSentTime = new Date().getTime();

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
      showError("Is " + to + " a valid number? Please wait 5 seconds.");
      disableButtonForFiveSeconds("send-code");
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

function delay(ms) {
  var counter = 5;
  const timer = setInterval(() => {
    showModalStatus(
      "Incorrect token! please wait " +
        counter.toString() +
        " seconds before trying again.",
      { color: "#a94442" }
    );
    counter--;
    if (counter == 0) {
      clearInterval(timer);
    }
  }, 1000);

  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function disableButtonForFiveSeconds(id) {
  const button = document.getElementById(id); // Replace 'myButton' with the ID of your button

  button.disabled = true; // Disable the button
  button.classList.add("off");
  await delay(5000); // Wait for 5 seconds using the delay() function
  button.disabled = false; // Enable the button after 5 seconds
  button.classList.remove("off");
}

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
      document.getElementById("submit_button").classList.remove("off");
      document.getElementById("submit_button").disabled = false;
      showModalStatus("Verification success! Redirecting...", {
        color: "green",
      });
      code.value = "";
      //show success and auto close
      setTimeout(function () {
        modal.style.display = "none";
        modalwrapper.style.display = "none";
        document.getElementById("send-code").style.display = "none";
        document.getElementById("phone_number").classList.add("valid");
        document.getElementById("phone_number").disabled = true;
        clearStatus();
      }, 2000);
    } else {
      disableButtonForFiveSeconds("check-code");
      showModalStatus(
        "Incorrect token! please wait 5 seconds before trying again.",
        { color: "#a94442" }
      );
      new Promise((resolve) => setTimeout(resolve, 5000));
      code.value = "";
    }
  } catch (error) {
    console.error(error);
    showModalStatus("Something went wrong!");
    code.value = "";
  }
}

let checkCode = document.getElementById("check-code");
checkCode.addEventListener("click", (event) => checkOtp(event));

let closeButton = document.getElementById("close");
closeButton.addEventListener("click", () => {
  modal.style.display = "none";
});

var phoneNumberInput = document.getElementById("phone_number");

phoneNumberInput.addEventListener("input", function () {
  const inputValue = phoneNumberInput.value;

  const formattedPhoneNumber = format_phone(inputValue);

  phoneNumberInput.value = formattedPhoneNumber;
});

function format_phone(input) {
  input = input.replace(/\D/g, "");
  var size = input.length;
  if (size > 0) input = "(" + input;
  if (size > 3) input = input.slice(0, 4) + ") " + input.slice(4, 11);
  if (size > 6) input = input.slice(0, 9) + "-" + input.slice(9);
  return input;
}

function remove_phone_format(input) {
  const digitsOnly = input.replace(/\D/g, "");
  const formattedNumber = "+1" + digitsOnly;

  return formattedNumber;
}

//get email input
var emailInput = document.getElementById("email");

//add listener
emailInput.addEventListener("input", function () {
  emailInput.classList.remove("invalid", "valid");

  //wait 1sec till adding invalid class while inputting
  setTimeout(() => {
    //get email value
    const email = emailInput.value;

    if (isEmailValid(email)) {
      // add valid class
      emailInput.classList.add("valid");
    } else if (email == "") {
      //remove all classes
      emailInput.classList.remove("invalid", "valid");
    } else {
      //invliad clas
      emailInput.classList.add("invalid");
    }
  }, 1000);
});

function isEmailValid(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

//automatically set mid-width of progress indicator based on 'form-step'
var indicators = document.querySelectorAll('[data-form="progress-indicator"]');
indicators.forEach((item) => {
  item.style.minWidth = ((1 / indicators.length) * 100).toString() + "%";
});
