async function generateUniqueSlug(title, model) {
    // Generate base slug from title
    let baseSlug = toSlug(title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Check if slug already exists in DB
    while (await model.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
    }
    return slug;
}

module.exports = generateUniqueSlug;


function toSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, "-"); // replace spaces & special chars with -
}
