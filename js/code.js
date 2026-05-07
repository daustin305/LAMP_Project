const urlBase = "https://lamp.drakeaustin.com/LAMPAPI";
const extension = "php";

let userId = 0;
let firstName = "";
let lastName = "";
let selectedContactId = 0;
let contactResults = [];

document.addEventListener("DOMContentLoaded", () => {
	initIndexPage();
	initContactsPage();
});

async function apiRequest(endpoint, payload) {
	const response = await fetch(`${urlBase}/${endpoint}.${extension}`, {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		throw new Error(`Request failed (${response.status})`);
	}

	return response.json();
}

function setStatus(elementId, text) {
	const element = document.getElementById(elementId);
	if (element) {
		element.textContent = text;
	}
}

function initIndexPage() {
	const loginForm = document.getElementById("loginForm");
	const signupForm = document.getElementById("signupForm");
	if (!loginForm || !signupForm) {
		return;
	}

	const loginToggle = document.getElementById("showLoginButton");
	const signupToggle = document.getElementById("showSignupButton");

	loginToggle.addEventListener("click", () => showAuthForm("login"));
	signupToggle.addEventListener("click", () => showAuthForm("signup"));

	loginForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		await doLogin();
	});

	signupForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		await doSignup();
	});
}

function showAuthForm(mode) {
	const loginForm = document.getElementById("loginForm");
	const signupForm = document.getElementById("signupForm");
	const loginToggle = document.getElementById("showLoginButton");
	const signupToggle = document.getElementById("showSignupButton");

	if (mode === "signup") {
		loginForm.classList.add("hidden");
		signupForm.classList.remove("hidden");
		signupToggle.classList.add("active");
		loginToggle.classList.remove("active");
		return;
	}

	signupForm.classList.add("hidden");
	loginForm.classList.remove("hidden");
	loginToggle.classList.add("active");
	signupToggle.classList.remove("active");
}

async function doLogin() {
	userId = 0;
	firstName = "";
	lastName = "";

	const login = document.getElementById("loginName").value.trim();
	const password = document.getElementById("loginPassword").value;
	setStatus("loginResult", "");

	if (!login || !password) {
		setStatus("loginResult", "Please enter username and password.");
		return;
	}

	try {
		const jsonObject = await apiRequest("Login", { login, password });
		userId = Number(jsonObject.id) || 0;

		if (userId < 1) {
			setStatus("loginResult", jsonObject.error || "User/password combination incorrect.");
			return;
		}

		firstName = jsonObject.firstName || "";
		lastName = jsonObject.lastName || "";
		saveCookie();
		window.location.href = "contacts.html";
	} catch (err) {
		setStatus("loginResult", err.message);
	}
}

async function doSignup() {
	const first = document.getElementById("signupFirstName").value.trim();
	const last = document.getElementById("signupLastName").value.trim();
	const login = document.getElementById("signupLogin").value.trim();
	const password = document.getElementById("signupPassword").value;
	setStatus("signupResult", "");

	if (!first || !last || !login || !password) {
		setStatus("signupResult", "All fields are required.");
		return;
	}

	try {
		const jsonObject = await apiRequest("Signup", {
			firstName: first,
			lastName: last,
			login,
			password
		});

		userId = Number(jsonObject.id) || 0;
		if (userId < 1 || jsonObject.error) {
			setStatus("signupResult", jsonObject.error || "Could not create account.");
			return;
		}

		firstName = jsonObject.firstName || first;
		lastName = jsonObject.lastName || last;
		saveCookie();
		window.location.href = "contacts.html";
	} catch (err) {
		setStatus("signupResult", err.message);
	}
}

function saveCookie() {
	const minutes = 20;
	const date = new Date();
	date.setTime(date.getTime() + (minutes * 60 * 1000));

	document.cookie = `firstName=${encodeURIComponent(firstName)};expires=${date.toUTCString()};path=/`;
	document.cookie = `lastName=${encodeURIComponent(lastName)};expires=${date.toUTCString()};path=/`;
	document.cookie = `userId=${userId};expires=${date.toUTCString()};path=/`;
}

function readCookie() {
	userId = -1;
	firstName = "";
	lastName = "";

	const entries = document.cookie.split(";");
	for (const rawEntry of entries) {
		const entry = rawEntry.trim();
		if (!entry) {
			continue;
		}
		const [key, ...rest] = entry.split("=");
		const value = rest.join("=");

		if (key === "firstName") {
			firstName = decodeURIComponent(value || "");
		} else if (key === "lastName") {
			lastName = decodeURIComponent(value || "");
		} else if (key === "userId") {
			userId = Number(value);
		}
	}
}

function doLogout() {
	document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	window.location.href = "index.html";
}

let lastSearchQuery = "";
let lastSearchExecuted = false;

function initContactsPage() {
	const searchInput = document.getElementById("searchText");
	const searchButton = document.getElementById("searchContactButton");
	if (!searchInput || !searchButton) {
		return;
	}

	readCookie();
	if (!userId || userId < 1) {
		window.location.href = "index.html";
		return;
	}

	const nameLabel = document.getElementById("userName");
	if (nameLabel) {
		nameLabel.textContent = `Welcome, ${firstName} ${lastName}`;
	}

	// Ensure UI starts clean. Results should not appear until "Search" is pressed.
	const dropdown = document.getElementById("searchDropdown");
	if (dropdown) {
		dropdown.classList.add("hidden");
		dropdown.innerHTML = "";
	}

	const editPanel = document.getElementById("editPanel");
	if (editPanel) {
		editPanel.classList.add("hidden");
	}

	document.getElementById("logoutButton").addEventListener("click", doLogout);
	searchButton.addEventListener("click", () => searchContacts());
	searchInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			searchContacts();
		}
	});
	searchInput.addEventListener("input", () => {
		const dropdown = document.getElementById("searchDropdown");
		if (!dropdown || dropdown.classList.contains("hidden")) {
			return;
		}

		// If the user edits the search box without pressing "Search",
		// hide the old results so new results only appear after clicking Search.
		const current = searchInput.value.trim();
		if (lastSearchExecuted && current !== lastSearchQuery) {
			dropdown.classList.add("hidden");
			setStatus("contactSearchResult", "");
		}
	});

	document.getElementById("addContactForm").addEventListener("submit", async (event) => {
		event.preventDefault();
		await addContact();
	});

	const editForm = document.getElementById("editContactForm");
	const cancelEditButton = document.getElementById("cancelEditButton");
	const editFirstName = document.getElementById("editFirstName");
	const editLastName = document.getElementById("editLastName");
	const editPhone = document.getElementById("editPhone");
	const editEmail = document.getElementById("editEmail");
	const saveEditButton = document.getElementById("saveEditButton");

	if (editForm) {
		editForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			await saveEditChanges();
		});
	}

	if (cancelEditButton) {
		cancelEditButton.addEventListener("click", () => hideEditPanel());
	}

	// Enable/disable save based on validation rules.
	if (saveEditButton) {
		const rerender = () => validateEditFormAndUpdateSaveState();
		editFirstName?.addEventListener("input", rerender);
		editLastName?.addEventListener("input", rerender);
		editPhone?.addEventListener("input", rerender);
		editEmail?.addEventListener("input", rerender);
	}
}

async function searchContacts(queryOverride) {
	const searchInput = document.getElementById("searchText");
	const dropdown = document.getElementById("searchDropdown");
	if (!searchInput || !dropdown) {
		return;
	}

	const raw = queryOverride !== undefined ? queryOverride : searchInput.value;
	const search = String(raw).trim();
	const currentInput = searchInput.value.trim();
	lastSearchQuery = search;
	lastSearchExecuted = true;

	setStatus("contactSearchResult", "");
	try {
		const jsonObject = await apiRequest("SearchContacts", { search, userId });
		contactResults = Array.isArray(jsonObject.results) ? jsonObject.results : [];

		if (!contactResults.length) {
			renderSearchDropdown([]);
			setStatus("contactSearchResult", jsonObject.error || "No contacts found.");
			if (currentInput !== lastSearchQuery) {
				dropdown.classList.add("hidden");
				setStatus("contactSearchResult", "");
			}
			return;
		}

		renderSearchDropdown(contactResults);
		setStatus("contactSearchResult", `${contactResults.length} contact(s) found.`);
		if (currentInput !== lastSearchQuery) {
			dropdown.classList.add("hidden");
			setStatus("contactSearchResult", "");
		}
	} catch (err) {
		renderSearchDropdown([]);
		setStatus("contactSearchResult", err.message);
		if (currentInput !== lastSearchQuery) {
			dropdown.classList.add("hidden");
			setStatus("contactSearchResult", "");
		}
	}
}

function renderSearchDropdown(results) {
	const dropdown = document.getElementById("searchDropdown");
	if (!dropdown) {
		return;
	}

	dropdown.innerHTML = "";

	if (!results.length) {
		dropdown.classList.add("hidden");
		return;
	}

	for (const contact of results) {
		const contactId = Number(contact.ID);

		const item = document.createElement("div");
		item.className = "contact-item";
		item.dataset.id = String(contactId);

		const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
		const phone = contact.Phone || "";
		const email = contact.Email || "";

		item.innerHTML = `
			<div class="contact-row">
				<div class="contact-meta">
					<div><strong>${fullName}</strong></div>
					<div>${phone ? `Phone: ${escapeHtml(phone)}` : "Phone: -"}</div>
					<div>${email ? `Email: ${escapeHtml(email)}` : "Email: -"}</div>
				</div>
				<div class="contact-actions">
					<button class="small-button edit-button" type="button" data-action="edit" data-id="${contactId}">Edit</button>
					<button class="small-button delete-button" type="button" data-action="delete" data-id="${contactId}">Delete</button>
				</div>
			</div>
		`;

		// Button clicks should not trigger any parent selection.
		const editBtn = item.querySelector('[data-action="edit"]');
		const deleteBtn = item.querySelector('[data-action="delete"]');
		editBtn?.addEventListener("click", (e) => {
			e.stopPropagation();
			openEditPanel(contactId);
		});
		deleteBtn?.addEventListener("click", (e) => {
			e.stopPropagation();
			deleteContactById(contactId);
		});

		dropdown.appendChild(item);
	}

	dropdown.classList.remove("hidden");
}

function escapeHtml(s) {
	return String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function openEditPanel(contactId) {
	selectedContactId = Number(contactId);

	const contact = contactResults.find((entry) => Number(entry.ID) === selectedContactId);
	if (!contact) {
		return;
	}

	const editPanel = document.getElementById("editPanel");
	if (!editPanel) {
		return;
	}

	document.getElementById("editFirstName").value = contact.firstName || "";
	document.getElementById("editLastName").value = contact.lastName || "";
	document.getElementById("editPhone").value = contact.Phone || "";
	document.getElementById("editEmail").value = contact.Email || "";

	setStatus("contactEditResult", `Editing ${contact.firstName || ""} ${contact.lastName || ""}.`);
	editPanel.classList.remove("hidden");
	validateEditFormAndUpdateSaveState();
}

function hideEditPanel() {
	selectedContactId = 0;
	const editPanel = document.getElementById("editPanel");
	if (editPanel) {
		editPanel.classList.add("hidden");
	}

	const editForm = document.getElementById("editContactForm");
	editForm?.reset?.();
	setStatus("contactEditResult", "");

	const saveEditButton = document.getElementById("saveEditButton");
	if (saveEditButton) {
		saveEditButton.disabled = true;
	}
}

function validateEditFormAndUpdateSaveState() {
	const saveEditButton = document.getElementById("saveEditButton");
	if (!saveEditButton) {
		return false;
	}

	const first = document.getElementById("editFirstName")?.value.trim() || "";
	const last = document.getElementById("editLastName")?.value.trim() || "";
	const phone = document.getElementById("editPhone")?.value.trim() || "";
	const email = document.getElementById("editEmail")?.value.trim() || "";

	const canSave = Boolean(first && last && (phone || email));
	saveEditButton.disabled = !canSave;
	return canSave;
}

async function saveEditChanges() {
	if (!selectedContactId) {
		setStatus("contactEditResult", "Select a contact to edit.");
		return;
	}

	const first = document.getElementById("editFirstName").value.trim();
	const last = document.getElementById("editLastName").value.trim();
	const phone = document.getElementById("editPhone").value.trim();
	const email = document.getElementById("editEmail").value.trim();

	if (!first || !last || (!phone && !email)) {
		setStatus("contactEditResult", "First name, last name, and (phone or email) are required.");
		return;
	}

	try {
		const jsonObject = await apiRequest("UpdateContact", {
			userId,
			contactId: selectedContactId,
			firstName: first,
			lastName: last,
			phone,
			email
		});

		if (jsonObject.error) {
			setStatus("contactEditResult", jsonObject.error);
			return;
		}

		setStatus("contactEditResult", "Saved changes.");

		// Keep results consistent if a search is already being displayed.
		if (lastSearchExecuted) {
			await searchContacts(lastSearchQuery);
			openEditPanel(selectedContactId);
		}
	} catch (err) {
		setStatus("contactEditResult", err.message);
	}
}

async function deleteContactById(contactId) {
	const cid = Number(contactId);
	if (!cid || cid < 1) {
		return;
	}

	try {
		const jsonObject = await apiRequest("DeleteContact", { userId, contactId: cid });
		if (jsonObject.error) {
			setStatus("contactSearchResult", jsonObject.error);
			return;
		}

		// If deleting the contact we're currently editing, close the edit panel.
		if (selectedContactId === cid) {
			hideEditPanel();
		}

		setStatus("contactSearchResult", "Contact deleted.");

		if (lastSearchExecuted) {
			await searchContacts(lastSearchQuery);
		}
	} catch (err) {
		setStatus("contactSearchResult", err.message);
	}
}

async function addContact() {
	const first = document.getElementById("addFirstName").value.trim();
	const last = document.getElementById("addLastName").value.trim();
	const phone = document.getElementById("addPhone").value.trim();
	const email = document.getElementById("addEmail").value.trim();
	setStatus("contactAddResult", "");

	if (!first || !last || (!phone && !email)) {
		setStatus("contactAddResult", "Enter first/last name and at least one of phone or email.");
		return;
	}

	try {
		const jsonObject = await apiRequest("AddContact", {
			userId,
			firstName: first,
			lastName: last,
			phone,
			email
		});

		if (jsonObject.error) {
			setStatus("contactAddResult", jsonObject.error);
			return;
		}

		setStatus("contactAddResult", "Contact added successfully.");
		document.getElementById("addContactForm").reset();

		// If a search is currently displayed, refresh the dropdown so the added contact appears.
		if (lastSearchExecuted) {
			await searchContacts(lastSearchQuery);
		}
	} catch (err) {
		setStatus("contactAddResult", err.message);
	}
}
