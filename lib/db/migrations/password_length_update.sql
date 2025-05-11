-- Increase the password column length in the User table
ALTER TABLE "User" ALTER COLUMN "password" TYPE varchar(100); 