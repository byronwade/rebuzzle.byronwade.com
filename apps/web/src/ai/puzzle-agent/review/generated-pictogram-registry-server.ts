import "server-only";
import { createGeneratedPictogramRegistry } from "./generated-pictogram-registry";
import { createMongoGeneratedPictogramRepository } from "./mongo-generated-pictogram-repository";

export const generatedPictogramRegistry = createGeneratedPictogramRegistry(
  createMongoGeneratedPictogramRepository()
);
