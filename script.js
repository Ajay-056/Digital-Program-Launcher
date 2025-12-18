document.addEventListener('DOMContentLoaded', () => {
    const statusList = document.getElementById('status-list');
    const animationContainer = document.getElementById('animation-container');
    const launchedImage = document.getElementById('launched-image');
    const statusMessage = document.querySelector('p');
    const countdownTimer = document.getElementById('countdown-timer');

    const updateParticipantList = (participants) => {
        statusList.innerHTML = '';
        participants.forEach(name => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant';
            participantElement.textContent = `${name} has launched!`;
            statusList.appendChild(participantElement);
        });
        if (participants.length > 0) statusMessage.textContent = 'Launch in progress...';
    };

    const showLaunchImage = (imageUrl) => {
        animationContainer.classList.remove('hidden');
        launchedImage.src = imageUrl;
    };

    const startConfetti = () => {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        const confettiCount = 200;
        const particles = [];
        const colors = ["#e8f0fe", "#1a73e8", "#1558b3", "#f0f2f5"];

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        class ConfettiParticle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height - canvas.height;
                this.size = Math.random() * 10 + 5;
                this.vx = Math.random() * 2 - 1;
                this.vy = Math.random() * 5 + 2;
                this.rotation = Math.random() * 360;
                this.rotationSpeed = Math.random() * 20 - 10;
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotationSpeed;
                if (this.y > canvas.height) {
                    this.y = -this.size;
                    this.x = Math.random() * canvas.width;
                }
            }
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation * Math.PI / 180);
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                ctx.restore();
            }
        }

        for (let i = 0; i < confettiCount; i++) {
            particles.push(new ConfettiParticle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }
        animate();
    };

    const startCountdown = (duration, imageUrl) => {
        statusList.style.display = 'none';
        statusMessage.textContent = "Final launch sequence initiated!";
        countdownTimer.classList.remove('hidden');
        
        let timer = duration;
        const updateTimer = () => {
            countdownTimer.textContent = timer;
            if (timer-- <= 0) {
                clearInterval(interval);
                countdownTimer.style.display = 'none';
                statusMessage.textContent = 'Launched!';
                showLaunchImage(imageUrl);
                startConfetti();
            }
        };

        const interval = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call
    };

    const setupEventSource = (initialData) => {
        const eventSource = new EventSource('/events');
        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'new_user') {
                const p = document.createElement('div');
                p.className = 'participant';
                p.textContent = `${data.name} has launched!`;
                statusList.appendChild(p);
                statusMessage.textContent = 'Launch in progress...';
            } else if (data.type === 'launch') {
                startCountdown(initialData.countdown, data.image_url);
                eventSource.close();
            }
        };
        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            eventSource.close();
        };
    };

    const fetchInitialState = async () => {
        try {
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            updateParticipantList(data.participants);
            
            if (data.participants.length < data.target) {
                setupEventSource(data);
            } else {
                startCountdown(data.countdown, 'https://picsum.photos/seed/rocket/600/400');
            }
        } catch (error) {
            console.error('Fetch initial state error:', error);
            statusMessage.textContent = 'Could not load launch status.';
        }
    };

    fetchInitialState();
});
