// export const extractSkillsFromText = (text, requiredSkills = []) => {
//   if (!Array.isArray(requiredSkills)) return [];

//   const lowerText = text.toLowerCase();

//   const extractedSkills = requiredSkills.filter(skill =>
//     lowerText.includes(skill.toLowerCase())
//   );

//   return [...new Set(extractedSkills)];
// };

// export const compareSkills = (candidateSkills, jobSkills) => {
//   const matchedSkills = candidateSkills.filter(skill =>
//     jobSkills.includes(skill)
//   );

//   const score = Math.round(
//     (matchedSkills.length / jobSkills.length) * 100
//   );

//   return {
//     score,
//     matchedSkills,
//     missingSkills: jobSkills.filter(
//       skill => !candidateSkills.includes(skill)
//     )
//   };
// };

