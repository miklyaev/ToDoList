const STORAGE_KEY = "todolist-tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector(".task-list__items");
const taskCount = document.querySelector(".task-list__count");
const taskSummary = document.querySelector(".task-list__summary");
const emptyState = document.querySelector("#task-list-empty");
const taskListPage = document.querySelector("#task-list-page");
const taskCreatePage = document.querySelector("#task-create-page");
const taskSearch = document.querySelector(".search-field__input");
const taskFilters = document.querySelector(".task-filters__buttons");
const pointerQuery = window.matchMedia("(any-pointer: coarse)");

function updatePointerMode(event) {
	document.documentElement.dataset.pointer = event.matches ? "coarse" : "fine";
}

updatePointerMode(pointerQuery);
pointerQuery.addEventListener("change", updatePointerMode);

let tasks = loadTasks();
let activeFilter = "all";
let searchQuery = "";

function loadTasks() {
	try {
		const storedTasks = localStorage.getItem(STORAGE_KEY);
		if (!storedTasks) return [];

		const parsedTasks = JSON.parse(storedTasks);
		if (!Array.isArray(parsedTasks)) return [];

		return parsedTasks.filter((task) =>
			task &&
			(typeof task.id === "string" || typeof task.id === "number") &&
			typeof task.text === "string" &&
			(task.status === "active" || task.status === "completed")
		);
	} catch {
		return [];
	}
}

function saveTasks() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
	} catch (error) {
		console.error("Не удалось сохранить задачи в localStorage.", error);
	}
}

function updateTaskSummary() {
	const activeTasks = tasks.filter((task) => task.status === "active").length;

	taskCount.textContent = tasks.length;
	taskSummary.textContent = `${activeTasks} осталось`;
}

function createTaskCard(task) {
	const card = document.createElement("li");
	card.className = "task-card";
	card.dataset.taskId = task.id;

	const isCompleted = task.status === "completed";
	if (isCompleted) card.classList.add("task-card--completed");

	const status = document.createElement("input");
	status.type = "checkbox";
	status.className = isCompleted
		? "task-card__status task-card__status--completed"
		: "task-card__status task-card__status--active";
	status.checked = !isCompleted;
	status.setAttribute("aria-label", `${isCompleted ? "Вернуть в активные" : "Отметить выполненной"}`);
	status.title = `${isCompleted ? "Вернуть в активные" : "Отметить выполненной"}`;

	const text = document.createElement("p");
	text.className = "task-card__text";
	text.textContent = task.text;

	const actions = document.createElement("div");
	actions.className = "task-card__actions";

	const deleteButton = document.createElement("button");
	deleteButton.className = "task-card__button task-card__button--delete";
	deleteButton.type = "button";
	deleteButton.textContent = "Удалить";
	deleteButton.setAttribute("aria-label", `Удалить задачу`);
	deleteButton.title = `Удалить задачу`;

	actions.append(deleteButton);
	card.append(status, text, actions);

	return card;
}

function renderTasks() {
	const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
	const visibleTasks = tasks.filter((task) => {
		const matchesStatus = activeFilter === "all" || task.status === activeFilter;
		const matchesQuery = task.text.toLocaleLowerCase().includes(normalizedQuery);
		return matchesStatus && matchesQuery;
	});

	taskList.replaceChildren(...visibleTasks.map(createTaskCard));
	updateTaskSummary();
	emptyState.hidden = visibleTasks.length > 0;
	emptyState.textContent = tasks.length === 0
		? "Пока нет задач. Добавьте задачу."
		: "Задачи не найдены. Измените фильтр или запрос.";
}

function renderPage() {
	const isCreatingTask = window.location.hash === "#new-task";
	taskListPage.hidden = isCreatingTask;
	taskCreatePage.hidden = !isCreatingTask;

	if (isCreatingTask) taskInput.focus();
}

function updateDeleteButtonTouchState(event, isTouching) {
	const deleteButton = event.target.closest(".task-card__button--delete");
	deleteButton?.classList.toggle("task-card__button--touching", isTouching);
}

taskList.addEventListener("touchstart", (event) => {
	updateDeleteButtonTouchState(event, true);
}, { passive: true });

taskList.addEventListener("touchend", (event) => {
	updateDeleteButtonTouchState(event, false);
});

taskList.addEventListener("touchcancel", (event) => {
	updateDeleteButtonTouchState(event, false);
});

taskList.addEventListener("click", (event) => {
	const deleteButton = event.target.closest(".task-card__button--delete");
	if (!deleteButton) return;

	const card = deleteButton.closest(".task-card");
	const taskId = card?.dataset.taskId;
	if (!taskId) return;
	const task = tasks.find((item) => String(item.id) === taskId);
	if (!task || !window.confirm(`Удалить задачу «${task.text}»?`)) return;

	tasks = tasks.filter((task) => String(task.id) !== taskId);
	saveTasks();
	renderTasks();
});

taskList.addEventListener("change", (event) => {
	const checkbox = event.target.closest(".task-card__status");
	if (!checkbox) return;

	const card = checkbox.closest(".task-card");
	const task = tasks.find((item) => String(item.id) === card?.dataset.taskId);
	if (!task) return;

	task.status = checkbox.checked ? "active" : "completed";
	saveTasks();
	renderTasks();
});

taskFilters.addEventListener("click", (event) => {
	const button = event.target.closest("button[data-filter]");
	if (!button) return;

	activeFilter = button.dataset.filter;
	taskFilters.querySelectorAll("button[data-filter]").forEach((filterButton) => {
		const isActive = filterButton === button;
		filterButton.classList.toggle("task-filters__button--active", isActive);
		filterButton.setAttribute("aria-pressed", String(isActive));
	});
	renderTasks();
});

taskSearch.addEventListener("input", () => {
	searchQuery = taskSearch.value;
	renderTasks();
});

taskForm.addEventListener("submit", (event) => {
	event.preventDefault();

	const text = taskInput.value.trim();
	if (!text) {
		taskInput.focus();
		return;
	}

	tasks.push({
		id: crypto.randomUUID(),
		text,
		status: "active",
	});

	saveTasks();
	renderTasks();
	taskInput.value = "";
	window.location.hash = "tasks";
});

window.addEventListener("hashchange", renderPage);
renderTasks();
renderPage();
