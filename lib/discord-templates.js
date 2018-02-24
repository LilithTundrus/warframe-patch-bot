

class errorMessageEmbedTemplate {
    constructor({ title = 'Error', color = 3447003, description }) {
        this.title = title;
        this.color = color
        this.description = description
    }
    // Setters go here
}

class baseEmbedTemplate {
    constructor({ title = '', color = 3447003, description }) {
        this.title = title;
        this.color = color
        this.description = description
    }
    // Setters go here
}

module.exports.errorMessageEmbedTemplate = errorMessageEmbedTemplate;
module.exports.baseEmbedTemplate = baseEmbedTemplate;