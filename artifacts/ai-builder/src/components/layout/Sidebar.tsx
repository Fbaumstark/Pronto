import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProjects, useCreateProject, useDeleteProject } from "@workspace/api-client-react";
import { Plus, FolderGit2, Trash2, Code2, Loader2, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  
  const { data: projects, isLoading } = useListProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    try {
      const newProj = await createMutation.mutateAsync({
        data: { name: newProjectName, description: newProjectDesc }
      });
      setIsCreating(false);
      setNewProjectName("");
      setNewProjectDesc("");
      setLocation(`/project/${newProj.id}`);
    } catch (err) {
      console.error("Failed to create project", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteMutation.mutateAsync({ id });
      if (location === `/project/${id}`) {
        setLocation("/");
      }
    }
  };

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col shadow-2xl z-20 shrink-0">
      <div className="p-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform duration-300">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground tracking-tight">AI Builder</h1>
            <p className="text-xs text-muted-foreground font-medium">Workspace</p>
          </div>
        </Link>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Projects</h2>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-md transition-colors text-muted-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {isCreating && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-muted/50 p-3 rounded-xl border border-border/50 overflow-hidden"
              onSubmit={handleCreate}
            >
              <input
                autoFocus
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
                placeholder="Project Name..."
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
              <input
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
                placeholder="Description (optional)"
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-muted hover:bg-muted-foreground/20 text-foreground text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <ul className="space-y-1.5">
            {projects?.map((project) => {
              const isActive = location === `/project/${project.id}`;
              return (
                <li key={project.id}>
                  <Link 
                    href={`/project/${project.id}`}
                    className={`
                      group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <FolderGit2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                      <div className="truncate">
                        <span className="truncate block">{project.name}</span>
                        {isActive && (
                          <span className="text-[10px] text-primary/70 block font-normal">Active</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, project.id)}
                      disabled={deleteMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-md transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </li>
              );
            })}
            {projects?.length === 0 && !isCreating && (
              <div className="text-center py-8 px-4 text-xs text-muted-foreground">
                No projects yet. Create one to get started!
              </div>
            )}
          </ul>
        )}
      </div>
      
      {/* User profile mock */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-2 py-2 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Creator</p>
            <p className="text-xs text-muted-foreground truncate">Free Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
