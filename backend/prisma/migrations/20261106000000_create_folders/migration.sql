CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "name" VARCHAR(248) NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "folders_name_valid" CHECK ("name" <> '' AND "name" NOT IN ('.', '..') AND "name" !~ '[/\\[:cntrl:]]'),
    CONSTRAINT "folders_not_own_parent" CHECK ("parent_id" <> "id")
);

CREATE UNIQUE INDEX "folders_parent_id_name_key" ON "folders"("parent_id", "name") NULLS NOT DISTINCT;
