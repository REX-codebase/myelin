import { EnvironmentInjector, createNgModuleRef } from '@angular/core';
import { FeatureModule } from './feature.module';

export function loadFeature(parent: EnvironmentInjector) {
  return createNgModuleRef(FeatureModule, parent);
}
