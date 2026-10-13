-- UploadAuthorization: server-issued authorizations for publish-time
-- Cloudinary uploads. See prisma/schema.prisma for the rationale.

CREATE TABLE "UploadAuthorization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadAuthorization_publicId_key" ON "UploadAuthorization"("publicId");
CREATE INDEX "UploadAuthorization_userId_issuedAt_idx" ON "UploadAuthorization"("userId", "issuedAt");
CREATE INDEX "UploadAuthorization_expiresAt_idx" ON "UploadAuthorization"("expiresAt");

ALTER TABLE "UploadAuthorization" ADD CONSTRAINT "UploadAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
