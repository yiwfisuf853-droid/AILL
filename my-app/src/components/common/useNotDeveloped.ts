import { toast } from "@/components/ui/toast";

export function useNotDeveloped() {
  return (name?: string) => {
    toast.info(name ? `${name}功能暂未开发，敬请期待` : '该功能暂未开发，敬请期待');
  };
}
