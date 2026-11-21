/** Faculty turf colours (one per faculty in FACULTIES; distinct on the night map). */
export const FACULTY_COLOR: Record<string, string> = {
  "Arts & Humanities": "#ff6fb1",
  "Business (Ivey)": "#2ed47a",
  Education: "#ffb347",
  Engineering: "#7b2ff7",
  "Health Sciences": "#2ee6d6",
  "Information & Media Studies": "#ff4f4f",
  Law: "#c9a227",
  "Medicine & Dentistry": "#4fa3ff",
  Music: "#e05cff",
  Science: "#9be15d",
  "Social Science": "#ff8a3d",
  "Affiliate (Brescia / Huron / King's)": "#a7a3ff",
};
export const facultyColor = (f: string | null | undefined) => (f && FACULTY_COLOR[f]) || "#f6efff";
export const facultyShort = (f: string) => f.replace(/ \(.*\)$/, "").replace("Information & Media Studies", "FIMS");
