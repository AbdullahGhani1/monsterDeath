import { world } from '../core/ecs/world';

export const createParticleSystem = () => {
  return (dt: number) => {
    const particles = world.entities.filter((e) => e.type === 'particle' && e.particle?.active);

    for (const p of particles) {
      if (!p.position || !p.velocity || !p.particle) continue;

      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      
      // Gravity
      p.velocity.y += 0.2;

      p.particle.life -= dt;

      if (p.particle.life <= 0) {
        p.particle.active = false; // Mark inactive for reuse
      }
    }
  };
};

export const spawnDebris = (x: number, y: number, color: string) => {
  const COUNT = 12;
  
  for (let i = 0; i < COUNT; i++) {
    // Search for inactive particle in pool
    const p = world.entities.find(e => e.type === 'particle' && e.particle && !e.particle.active);

    if (p && p.position && p.velocity && p.particle) {
      // Reuse
      p.position.x = x;
      p.position.y = y;
      p.velocity.x = (Math.random() - 0.5) * 10;
      p.velocity.y = (Math.random() - 0.5) * 10 - 5;
      p.particle.life = 1000 + Math.random() * 1000;
      p.particle.color = color;
      p.particle.active = true;
    } else {
      // Create new if pool is empty
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
          size: 2 + Math.random() * 4,
          active: true
        }
      });
    }
  }
};
