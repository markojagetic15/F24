CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "files_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "files_name_valid" CHECK ("name" <> '' AND "name" NOT IN ('.', '..') AND "name" !~ '[/\\[:cntrl:]]')
);

CREATE UNIQUE INDEX "files_parent_id_name_key" ON "files"("parent_id", "name") NULLS NOT DISTINCT;
