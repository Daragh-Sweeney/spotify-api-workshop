//  Author: Daragh Sweeney
//  Project: Large Music Data Visualization

/* event listener to direct user to logout page */
document.querySelector('.logout-button').addEventListener('click', function() {window.location.href = '/logout';});

/* Set up Three scene  in the three container */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('three-container').appendChild(renderer.domElement);

// Raycaster and Mouse Setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const audio = new Audio();
const currentSongElement = document.getElementById('current-song');
const playPauseButton = document.getElementById('play-pause-btn');
const waveformElement = document.getElementById('waveform');

/* Orbit Control is used to orbit camera around the sun  */
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;


/* After setting up the scene I set up the starfield around the environment */
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1000 * 3), 3));

for (let i = 0; i < 2000; i++) {
    const star = new THREE.Vector3(Math.random() * 2000 - 1000, Math.random() * 2000 - 1000, Math.random() * 2000 - 1000);
    starGeometry.attributes.position.setXYZ(i, star.x, star.y, star.z);
}
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);


/* Set up the sun and the lighting */
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);
const sunRadius = 25;
const sphereGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);
const sunMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff });
const lightSphere = new THREE.Mesh(sphereGeometry, sunMaterial);
lightSphere.position.set(0, 0, 0);
scene.add(lightSphere);
const sunLight = new THREE.PointLight(0xffffff, 1, 500);
sunLight.position.copy(lightSphere.position);
scene.add(sunLight);


/* Now we set up the Particle System for Tracks */
const particles = [];
const lines = [];
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 });
let playingParticle = null;


/* Function to Create Text Texture */
function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '48px Arial';
    const textWidth = context.measureText(text).width;
    canvas.width = textWidth;
    canvas.height = 48; // Height based on font size
    context.font = '48px Arial';
    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.fillText(text, 0, 0);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter; // Improve texture filtering
    texture.magFilter = THREE.LinearFilter;
    return texture;
}

/* This function is used to get the  */
async function addTrackParticles(tracks) {
    const genres = ['Blues', 'Classical', 'Country', 'Disco', 'HipHop', 'Jazz', 'Metal', 'Pop', 'Reggae', 'Rock'];
    const genreColors = {'Blues': 0x0000ff,'Classical': 0xffff00,'Country': 0xffa500,'Disco': 0xff00ff,'HipHop': 0x00ff00,'Jazz': 0x8a2be2,'Metal': 0x808080,'Pop': 0xffc0cb,'Reggae': 0xff0000,'Rock': 0x000000};

    async function fetchGenre(mp3path) {
        const response = await fetch(`/getGenre?previewUrl=${encodeURIComponent(mp3path)}`);
        const data = await response.json();
        return data.genre;
    }

    for (const t of tracks) {
        if (!t.track.preview_url) continue;
        const radius = Math.random() * (6 - 3) + 3;
        const theta = Math.random() * Math.PI * 2; // Angle around the vertical axis
        const phi = Math.acos(Math.random() * 2 - 1); // Angle from the vertical axis

        const x = radius * Math.sin(phi) * Math.cos(theta) * 50;
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi) * 50;

        const geometry = new THREE.DodecahedronGeometry(radius, 0); // Adjust detail as needed
        const genre = await fetchGenre(t.track.preview_url);
        const color = genreColors[genre];
        const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7, metalness: 0.2 });

        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(x, y, z);
        particle.userData = {preview_url: t.track.preview_url,name: t.track.name};
        scene.add(particle);

        particles.push(particle);
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, edgeMaterial);
        particle.add(line);

        // Create text label
        const textTexture = createTextTexture(t.track.name);
        const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
        const textSprite = new THREE.Sprite(textMaterial);
        textSprite.scale.set(10, 5, 1); // Adjust scale as needed
        textSprite.position.set(0, radius + 5, 0); // Position above the particle
        particle.add(textSprite);
    }
}


addTrackParticles(tracks); // Call the function with your tracks data
camera.position.z = 5000; // Camera Position

// Function to Find Closest Particles
function findClosestParticles(particle, count) {
    return particles
        .filter(p => p !== particle)
        .sort((a, b) => particle.position.distanceTo(a.position) - particle.position.distanceTo(b.position))
        .slice(0, count);
}

// Function to Draw Lines Between Particles
function drawLines(particle, closestParticles) {
    lines.forEach(line => scene.remove(line));
    lines.length = 0;

    function createLine(p1, p2) {
        const points = [p1.position.clone(), p2.position.clone()];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        lines.push(line);
      }

    closestParticles.forEach(closeParticle => {
        createLine(particle, closeParticle);
        const secondClosestParticles = findClosestParticles(closeParticle, 1);
        secondClosestParticles.forEach(secondCloseParticle => {createLine(closeParticle, secondCloseParticle);});
    });
}

/* The animation loop  is used */
function animate() {
    requestAnimationFrame(animate);
    camera.position.x = camera.position.x * Math.cos(0.0005) - camera.position.z * Math.sin(0.0005);
    camera.position.z = camera.position.z * Math.cos(0.0005) + camera.position.x * Math.sin(0.0005);
    camera.lookAt(scene.position);
    controls.update();
    renderer.render(scene, camera);
}

// Animate Camera to Zoom In and Fade Out Welcome Message
function animateCamera() {
    const targetZ = 200;
    const targetY = 100;
    const duration = 3000; // 3 seconds
    const startZ = camera.position.z;
    const startY = camera.position.y;
    const startTime = performance.now();
    const welcomeMessage = document.getElementById('welcome-message');

    function zoom(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        camera.position.z = startZ + (targetZ - startZ) * progress;
        camera.position.y = startY + (targetY - startY) * progress;
        welcomeMessage.style.opacity = 1 - progress;
        if (progress < 1) {requestAnimationFrame(zoom);}
        else {welcomeMessage.style.display = 'none';}
    }
    requestAnimationFrame(zoom);
}

// Call Animation Functions
animate();
animateCamera();




// Wavesurfer Setup
const wavesurfer = WaveSurfer.create({container: '#waveform',waveColor: 'white',progressColor: 'yellow',barWidth: 3,height: 60,responsive: true,});
wavesurfer.on('ready', function () {
    waveformElement.addEventListener('click', function (e) {
        const progress = (e.clientX - waveformElement.getBoundingClientRect().left) / waveformElement.clientWidth;
        wavesurfer.seekTo(progress);
    });
    wavesurfer.play();
});


// Mouse Click Event Listener
function onMouseClick(event) {

    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(particles);

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const previewUrl = intersected.userData.preview_url;

        if (audio.src !== previewUrl) {
            audio.src = previewUrl;
            currentSongElement.textContent = intersected.userData.name || 'Unknown song';
            playPauseButton.textContent = 'Pause';
            wavesurfer.load(previewUrl);

        } else {wavesurfer.playPause();}

        playingParticle = intersected;
        const closestParticles = findClosestParticles(playingParticle, 5);
        drawLines(playingParticle, closestParticles);

        // Animate camera to the selected particle
        gsap.to(camera.position, {
            duration: 1.5,
            x: intersected.position.x >= 0 ? intersected.position.x + 50 : intersected.position.x - 50,
            y: intersected.position.y >= 0 ? intersected.position.y + 200 : intersected.position.y + 200,
            z: intersected.position.z >= 0 ? intersected.position.z + 150 : intersected.position.z - 150,
            onUpdate: () => {camera.lookAt(intersected.position);}
        });
    }
}

/* calls on mouse click function */
window.addEventListener('click', onMouseClick, false);

/* Resize Window event listener */
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* The Play Pause button event listener */
playPauseButton.addEventListener('click', () => {
    if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
        playPauseButton.textContent = 'Play';
    } else {
        wavesurfer.play();
        playPauseButton.textContent = 'Pause';
    }
});