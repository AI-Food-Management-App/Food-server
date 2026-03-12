//Name
export function validateName(name) {
  if (!name || !name.trim())
    return "Name is required";
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim()))
    return "Name cannot contain special characters";
  return null;
}
// Date of Birth
export function validateDob(dob, minAge = 16) {
  if (!dob)
    return "Date of birth is required";
  const birth = new Date(dob);
  if (isNaN(birth.getTime()))
    return "Date of birth is invalid";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < minAge)
    return `You must be at least ${minAge} years old to register`;
  return null;
}
// Email
export function validateEmail(email) {
  if (!email || !email.trim())
    return "Email is required";
  if (!email.includes("@"))
    return "Email must contain @";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return "Email address is not valid";
  return null;
}
// Password
export function validatePassword(password) {
  //if (!password || !password.trim())
  if (!password)
    return "Password is required";
  if (password.length < 8)
    return "Password must be at least 8 characters";
  return null;
}
//Register
export function validateRegisterBody({ name, dob, email, password }) {
  const errors = {};

  const nameErr     = validateName(name);
  const dobErr      = validateDob(dob);
  const emailErr    = validateEmail(email);
  const passwordErr = validatePassword(password);

  if (nameErr)     errors.name     = nameErr;
  if (dobErr)      errors.dob      = dobErr;
  if (emailErr)    errors.email    = emailErr;
  if (passwordErr) errors.password = passwordErr;

  return Object.keys(errors).length ? errors : null;
}
//Login
export function validateLoginBody({ email, password }) {
  const errors = {};

  const emailErr    = validateEmail(email);
  const passwordErr = validatePassword(password);

  if (emailErr)    errors.email    = emailErr;
  if (passwordErr) errors.password = passwordErr;

  return Object.keys(errors).length ? errors : null;
}