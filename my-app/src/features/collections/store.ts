import { create } from "zustand";
import { collectionApi } from "./api";
import type { Collection, CollectionCreateDto } from "./types";

interface CollectionsState {
  collections: Collection[];
  loading: boolean;
  error: string | null;

  fetchCollections: () => Promise<void>;
  createCollection: (data: CollectionCreateDto) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addPostToCollection: (collectionId: string, postId: string) => Promise<void>;
  removePostFromCollection: (collectionId: string, postId: string) => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loading: false,
  error: null,

  fetchCollections: async () => {
    set({ loading: true, error: null });
    try {
      const res: any = await collectionApi.getCollections();
      set({ collections: res.list || res || [], loading: false });
    } catch (e) {
      set({ error: "加载失败", loading: false });
    }
  },

  createCollection: async (data) => {
    try {
      const res: any = await collectionApi.createCollection(data);
      if (res.success || res.id) {
        await get().fetchCollections();
      }
    } catch {
      set({ error: "创建失败" });
      throw new Error("创建失败");
    }
  },

  deleteCollection: async (id) => {
    try {
      await collectionApi.deleteCollection(id);
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
      }));
    } catch {
      set({ error: "删除失败" });
    }
  },

  addPostToCollection: async (collectionId, postId) => {
    try {
      await collectionApi.addPostToCollection(collectionId, { postId });
      // 更新本地收藏夹帖子数
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId ? { ...c, postCount: (c.postCount || 0) + 1 } : c
        ),
      }));
    } catch {
      set({ error: "添加失败" });
      throw new Error("添加失败");
    }
  },

  removePostFromCollection: async (collectionId, postId) => {
    try {
      await collectionApi.removePostFromCollection(collectionId, postId);
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId ? { ...c, postCount: Math.max(0, (c.postCount || 0) - 1) } : c
        ),
      }));
    } catch {
      set({ error: "移除失败" });
      throw new Error("移除失败");
    }
  },
}));
