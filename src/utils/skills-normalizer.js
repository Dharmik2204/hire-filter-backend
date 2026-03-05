const SKILL_SEPARATOR_REGEX = /[,;\n]+/;

const toArray = (input) => {
    if (Array.isArray(input)) return input;
    if (input === undefined || input === null) return [];
    return [input];
};

export const normalizeSkillsInput = (input) => {
    const values = toArray(input);
    const unique = new Set();
    const normalizedSkills = [];

    for (const value of values) {
        const text = String(value ?? "");
        const splitParts = text.split(SKILL_SEPARATOR_REGEX);

        for (const part of splitParts) {
            const skill = part.trim().toLowerCase();
            if (!skill || unique.has(skill)) continue;
            unique.add(skill);
            normalizedSkills.push(skill);
        }
    }

    return normalizedSkills;
};

export const normalizeSkillCompareKey = (skill) => {
    return String(skill ?? "")
        .trim()
        .toLowerCase()
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, "");
};
