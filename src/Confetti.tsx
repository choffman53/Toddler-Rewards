import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Physics variables
const gravityConfetti = 0.3;
const gravitySequins = 0.55;
const dragConfetti = 0.075;
const dragSequins = 0.02;
const terminalVelocity = 3;

// Colors
const colors = [
    { front: '#ec4899', back: '#be185d' }, // Pink
    { front: '#a855f7', back: '#7e22ce' }, // Purple
    { front: '#3b82f6', back: '#1d4ed8' }, // Blue
    { front: '#22c55e', back: '#15803d' }, // Green
    { front: '#eab308', back: '#a16207' }, // Yellow
    { front: '#ef4444', back: '#b91c1c' }, // Red
    { front: '#06b6d4', back: '#0e7490' }, // Cyan
];

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const initConfettoVelocity = (xRange: [number, number], yRange: [number, number]) => {
    const x = randomRange(xRange[0], xRange[1]);
    const range = yRange[1] - yRange[0] + 1;
    let y = yRange[1] - Math.abs(randomRange(0, range) + randomRange(0, range) - range);
    if (y >= yRange[1] - 1) {
        y += (Math.random() < .25) ? randomRange(1, 3) : 0;
    }
    return { x: x, y: -y };
};

class Confetto {
    randomModifier: number;
    color: { front: string, back: string };
    dimensions: { x: number, y: number };
    position: { x: number, y: number };
    rotation: number;
    scale: { x: number, y: number };
    velocity: { x: number, y: number };

    constructor(x: number, y: number) {
        this.randomModifier = randomRange(0, 99);
        this.color = colors[Math.floor(randomRange(0, colors.length))];
        this.dimensions = {
            x: randomRange(5, 9),
            y: randomRange(8, 15),
        };
        this.position = {
            x: randomRange(x - 20, x + 20),
            y: randomRange(y - 10, y + 10),
        };
        this.rotation = randomRange(0, 2 * Math.PI);
        this.scale = { x: 1, y: 1 };
        this.velocity = initConfettoVelocity([-9, 9], [6, 11]);
    }

    update() {
        this.velocity.x -= this.velocity.x * dragConfetti;
        this.velocity.y = Math.min(this.velocity.y + gravityConfetti, terminalVelocity);
        this.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.scale.y = Math.cos((this.position.y + this.randomModifier) * 0.09);
    }
}

class Sequin {
    color: string;
    radius: number;
    position: { x: number, y: number };
    velocity: { x: number, y: number };

    constructor(x: number, y: number) {
        this.color = colors[Math.floor(randomRange(0, colors.length))].back;
        this.radius = randomRange(1, 2);
        this.position = {
            x: randomRange(x - 20, x + 20),
            y: randomRange(y - 10, y + 10),
        };
        this.velocity = {
            x: randomRange(-6, 6),
            y: randomRange(-8, -12)
        };
    }

    update() {
        this.velocity.x -= this.velocity.x * dragSequins;
        this.velocity.y = this.velocity.y + gravitySequins;
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

export interface ConfettiHandle {
    burst: (x: number, y: number) => void;
}

export const ConfettiSystem = forwardRef<ConfettiHandle, {}>((_, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const confetti = useRef<Confetto[]>([]);
    const sequins = useRef<Sequin[]>([]);
    const animationFrame = useRef<number>(0);

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        confetti.current.forEach((confetto, index) => {
            let width = (confetto.dimensions.x * confetto.scale.x);
            let height = (confetto.dimensions.y * confetto.scale.y);
            ctx.translate(confetto.position.x, confetto.position.y);
            ctx.rotate(confetto.rotation);
            confetto.update();
            ctx.fillStyle = confetto.scale.y > 0 ? confetto.color.front : confetto.color.back;
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        });

        sequins.current.forEach((sequin, index) => {
            ctx.translate(sequin.position.x, sequin.position.y);
            sequin.update();
            ctx.fillStyle = sequin.color;
            ctx.beginPath();
            ctx.arc(0, 0, sequin.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        });

        // Remove off-screen particles
        confetti.current = confetti.current.filter(c => c.position.y < canvas.height);
        sequins.current = sequins.current.filter(s => s.position.y < canvas.height);

        if (confetti.current.length > 0 || sequins.current.length > 0) {
            animationFrame.current = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    useImperativeHandle(ref, () => ({
        burst: (x: number, y: number) => {
            for (let i = 0; i < 20; i++) confetti.current.push(new Confetto(x, y));
            for (let i = 0; i < 10; i++) sequins.current.push(new Sequin(x, y));
            cancelAnimationFrame(animationFrame.current);
            render();
        }
    }));

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[100]"
            style={{ width: '100%', height: '100%' }}
        />
    );
});
