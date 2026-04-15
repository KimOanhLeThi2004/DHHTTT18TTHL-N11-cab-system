CREATE ROLE auth_user WITH LOGIN PASSWORD 'auth_password';
CREATE DATABASE auth_db OWNER auth_user;

CREATE ROLE "user" WITH LOGIN PASSWORD 'user_password';
CREATE DATABASE user_db OWNER "user";

CREATE ROLE driver_user WITH LOGIN PASSWORD 'driver_pass';
CREATE DATABASE driver_db OWNER driver_user;

CREATE ROLE payment_user WITH LOGIN PASSWORD 'payment_pass';
CREATE DATABASE payment_db OWNER payment_user;

CREATE ROLE ride_user WITH LOGIN PASSWORD 'ride_pass';
CREATE DATABASE ride_db OWNER ride_user;

CREATE ROLE review_user WITH LOGIN PASSWORD 'review_pass';
CREATE DATABASE review_db OWNER review_user;
