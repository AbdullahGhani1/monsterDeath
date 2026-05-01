import { world } from '../core/ecs/world';

export const createParticleSystem = () => {
  return (dt: number) => {
    const particles = world.entities.filter((e) => e.type === 'particle' && e.particle);

    for (const p of particles) {
      if (!p.position || !p.velocity || !p.particle) continue;

      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      
      // Gravity
      p.velocity.y += 0.2;

      p.particle.life -= dt;

      if (p.particle.life <= 0) {
        world.remove(p);
      }
    }
  };
};

export const spawnDebris = (x: number, y: number, color: string) => {
  for (let i = 0; i < 8; i++) {
    world.add({
      id: `p-${Math.random()}`,
      type: 'particle',
      position: { x, y },
      velocity: { 
        x: (Math.random() - 0.5) * 10, 
        y: (Math.random() - 0.5) * 10 - 5 
      },
      particle: {
        life: 1000 + Math.random() * 1000,
        maxLife: 2000,
        color,
        size: 2 + Math.random() * 4
      }
    });
  }
};
