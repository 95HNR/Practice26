-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auto" (
    "rendszam" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "statusz" TEXT NOT NULL,

    CONSTRAINT "Auto_pkey" PRIMARY KEY ("rendszam")
);

-- CreateTable
CREATE TABLE "Ut" (
    "id" SERIAL NOT NULL,
    "soforNev" TEXT NOT NULL,
    "autoRendszam" TEXT NOT NULL,
    "indulas" TEXT NOT NULL,
    "erkezes" TEXT NOT NULL,
    "tavolsag" DOUBLE PRECISION NOT NULL,
    "koltseg" DOUBLE PRECISION NOT NULL,
    "fogyasztas" DOUBLE PRECISION NOT NULL,
    "honapEv" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Ut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Ut" ADD CONSTRAINT "Ut_autoRendszam_fkey" FOREIGN KEY ("autoRendszam") REFERENCES "Auto"("rendszam") ON DELETE RESTRICT ON UPDATE CASCADE;
