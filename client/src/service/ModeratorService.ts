import $api from "@http";
import type { AxiosResponse } from "axios";
import type { PublicNoteForModerator, ModeratorActionResponse } from "@models/response/ModeratorResponse";

export default class ModeratorService {
  static async getPublicNotes(): Promise<AxiosResponse<PublicNoteForModerator[]>> {
    return $api.get('/moderator/public-notes');
  }

  static async deleteNote(noteId: string): Promise<AxiosResponse<ModeratorActionResponse>> {
    return $api.delete(`/moderator/notes/${noteId}`);
  }

  static async blockNote(noteId: string): Promise<AxiosResponse<ModeratorActionResponse>> {
    return $api.post(`/moderator/notes/${noteId}/block`);
  }
}

