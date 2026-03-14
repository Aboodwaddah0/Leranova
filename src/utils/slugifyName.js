const slugifyName = (name) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
};

export default slugifyName;
