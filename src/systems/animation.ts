import { world, Entity } from '../core/ecs/world';

export const createAnimationSystem = () => {
  return (dt: number) => {
    const entities = world.entities.filter((e) => e.animator && e.sprite);

    for (const entity of entities) {
      const { animator, sprite } = entity;
      if (!animator || !sprite) continue;

      const sequence = animator.sequences[animator.currentSequence];
      if (!sequence) continue;

      animator.elapsedTime += dt;

      if (animator.elapsedTime >= sequence.speed) {
        animator.elapsedTime = 0;
        animator.currentFrameIndex++;

        if (animator.currentFrameIndex >= sequence.frames.length) {
          if (sequence.loop) {
            animator.currentFrameIndex = 0;
          } else {
            animator.currentFrameIndex = sequence.frames.length - 1;
            animator.isFinished = true;
          }
        }

        sprite.frame = sequence.frames[animator.currentFrameIndex];
      }
    }
  };
};

export const setAnimation = (entity: Entity, name: string) => {
  if (entity.animator && entity.animator.currentSequence !== name) {
    entity.animator.currentSequence = name;
    entity.animator.currentFrameIndex = 0;
    entity.animator.elapsedTime = 0;
    entity.animator.isFinished = false;
    if (entity.sprite) {
      entity.sprite.frame = entity.animator.sequences[name].frames[0];
    }
  }
};
