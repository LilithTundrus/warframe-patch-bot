

class erroMessageEmbedTemplate {
    constructor({ title = 'Error', color = 3447003, description }) {
        this.title = title;
        this.color = color
        this.description = description
    }
    // Setters go here
}

class baseEmbedTemplate {
    constructor({ title, color = 3447003, description }) {
        this.title = title;
        this.color = color
        this.description = description
    }
    // Setters go here
}

module.exports.erroMessageEmbedTemplate = erroMessageEmbedTemplate;
module.exports.baseEmbedTemplate = baseEmbedTemplate;