export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'consumable' | 'material' | 'key';
  assetId: string;
}

export interface WeaponDefinition extends ItemDefinition {
  damage: number;
  attackSpeed: number;
  range: number;
}

export interface MonsterDefinition {
  id: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  assetId: string;
  behavior: 'idle' | 'patrol' | 'aggressive';
}
