import { describe, expect, it } from "@jest/globals";
import { indexKeySignature, isBenignIndexConflict } from "../indexes";

describe("DB index bootstrap helpers", () => {
  describe("indexKeySignature", () => {
    it("keeps key order, which matters for compound indexes", () => {
      expect(indexKeySignature({ publishedAt: -1, active: 1 })).not.toBe(
        indexKeySignature({ active: 1, publishedAt: -1 })
      );
    });

    it("tells apart indexes on the same keys with different options", () => {
      const sparse = indexKeySignature({ "metadata.answerKey": 1 }, { sparse: true });
      const uniquePartial = indexKeySignature(
        { "metadata.answerKey": 1 },
        { unique: true, partialFilterExpression: { "metadata.uniquenessContract": "archive-v1" } }
      );
      expect(sparse).not.toBe(uniquePartial);
    });

    it("distinguishes different key patterns", () => {
      expect(indexKeySignature({ email: 1 })).not.toBe(indexKeySignature({ username: 1 }));
      expect(indexKeySignature({ points: -1 })).not.toBe(indexKeySignature({ points: 1 }));
    });
  });

  describe("isBenignIndexConflict", () => {
    it("treats Mongo index conflict codes as benign", () => {
      expect(isBenignIndexConflict({ code: 85, message: "IndexOptionsConflict" })).toBe(true);
      expect(isBenignIndexConflict({ code: 86, message: "IndexKeySpecsConflict" })).toBe(true);
    });

    it("treats equivalent-index messages as benign", () => {
      expect(
        isBenignIndexConflict(
          new Error("Index already exists with a different name: users_id_unique")
        )
      ).toBe(true);
      expect(isBenignIndexConflict(new Error("An equivalent index already exists"))).toBe(true);
    });

    it("does not treat real failures as benign", () => {
      expect(
        isBenignIndexConflict(
          new Error("E11000 duplicate key error collection: users index: email_1")
        )
      ).toBe(false);
      expect(
        isBenignIndexConflict(new Error("not authorized on rebuzzle to execute command"))
      ).toBe(false);
    });
  });
});
