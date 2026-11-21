import type { SubmissionType } from "@/data/types";
import { safeExternalUrl } from "@/lib/utils";

export interface SubmissionFormState {
  type: SubmissionType;
  name: string;
  province: string;
  description: string;
  coordinates: string;
  sourceUrl: string;
  contact: string;
  photoNote: string;
  permissionNote: string;
  email: string;
  trap: string;
}

export const EMPTY_SUBMISSION: SubmissionFormState = {
  type: "new-location",
  name: "",
  province: "",
  description: "",
  coordinates: "",
  sourceUrl: "",
  contact: "",
  photoNote: "",
  permissionNote: "",
  email: "",
  trap: "",
};

/**
 * Client-side validation only. Server-side validation lives in the Pages
 * Function and the database constraints — never trust this alone.
 */
export function validateSubmission(form: SubmissionFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.name.trim().length < 2) errors.name = "ระบุชื่อสถานที่อย่างน้อย 2 ตัวอักษร";
  if (!form.province) errors.province = "เลือกจังหวัด";
  if (form.description.trim().length < 30) {
    errors.description = "อธิบายอย่างน้อย 30 ตัวอักษร เพื่อให้ทีมตรวจสอบต่อได้";
  }
  if (form.sourceUrl.trim() && !safeExternalUrl(form.sourceUrl.trim())) {
    errors.sourceUrl = "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://";
  }
  if (form.coordinates.trim()) {
    const match = form.coordinates.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (!match) {
      errors.coordinates = "ใช้รูปแบบ latitude, longitude เช่น 13.75630, 100.50180";
    } else {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.coordinates = "พิกัดอยู่นอกช่วงที่เป็นไปได้";
      } else if (lat < 5 || lat > 21 || lng < 97 || lng > 106) {
        errors.coordinates = "พิกัดนี้อยู่นอกประเทศไทย — ตรวจสอบอีกครั้ง";
      }
    }
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "อีเมลไม่ถูกต้อง";
  }
  return errors;
}
