export function validateProfileUpdate({ name, dob, allergies }) {
  const errors = {};

  if (name !== undefined) {
    if (!name.trim()) errors.name = "Name cannot be empty";
    else if (!/^[a-zA-Z\s'-]+$/.test(name.trim()))
      errors.name = "Name cannot contain special characters";
  }

  if (dob !== undefined) {
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) errors.dob = "Invalid date of birth";
  }

  if (allergies !== undefined && !Array.isArray(allergies)) {
    errors.allergies = "Allergies must be a list";
  }

  return Object.keys(errors).length ? errors : null;
}