'use strict';


const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(distance, duration, coords) {
        this.distance = distance;
        this.duration = duration;
        this.coords = coords;
    }
}

class Running extends Workout {
    type = "running";
    constructor(distance, duration, coords, cadence) {
        super(distance, duration, coords);
        this.cadence = cadence;
        this.calcPace();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = "cycling";
    constructor(distance, duration, coords, elevationGain) {
        super(distance, duration, coords);

        this.elevationGain = elevationGain;
        this.calcSpeed();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
    }
}

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();
        this._getLocalStorage();
        form.addEventListener("submit", this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        navigator?.geolocation.getCurrentPosition(this._loadMap.bind(this));
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout =>
            this._renderWorkoutMarker(workout));
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add("hidden");
        setTimeout(() => form.style.display = 'grid', 200);
    }

    _toggleElevationField() {
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => {
            return inputs.every(input => !Number.isFinite(input));
        }

        const allPositive = (...inputs) => inputs.every(input => input > 0);

        e.preventDefault();

        const type = inputType.value;
        const distance = inputDistance.value;
        const duration = inputDuration.value;
        const { latlng: { lat, lng } } = this.#mapEvent;
        let workout;

        if (type === 'running') {
            const cadence = + inputCadence.value;
            if (!validInputs(distance, duration, cadence) && !allPositive(distance, duration, cadence)) return alert("input has to be a positive number");

            workout = new Running(distance, duration, [lat, lng], cadence);
        }

        if (type === 'cycling') {
            const elevation = + inputElevation.value;
            if (!validInputs(distance, duration, elevation) && !allPositive(distance, duration)) return alert("input has to be a positive number");

            workout = new Cycling(distance, duration, [lat, lng], elevation);
        }

        this.#workouts.push(workout);

        this._renderWorkoutMarker(workout);

        this._renderWorkout(workout);

        this._hideForm();

        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴‍♀️'} ${workout.duration}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        const date = new Date(Date.now());

        containerWorkouts.insertAdjacentHTML("beforeend",
            `<li class="workout workout--${workout.type}" data-id="${workout.id}" >
            <h2 class= "workout__title" > ${workout.type} on ${months[date.getMonth()]} ${date.getDay()}</h2 >
            <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
            </div >
            <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.type === 'cycling' ? workout.speed : workout.pace}</span>
            <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.type === 'cycling' ? workout.elevationGain : workout.cadence}</span>
            <span class="workout__unit">spm</span>
            </div>
            </li > `);

    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        console.log(workoutEl);
        console.log(this.#workouts);

        if (!workoutEl) return;
        const workout = this.#workouts.find(workout => workout.id === workoutEl.dataset.id);

        console.log(workout);
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    _setLocalStorage() {
        localStorage.setItem("workout", JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workout"));

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(workout =>
            this._renderWorkout(workout));
    }
}

const app = new App();
console.log(app);