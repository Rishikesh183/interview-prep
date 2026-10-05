import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProblem, loadProblems } from "@/lib/problems/load";
import { WorkspaceClient } from "./WorkspaceClient";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return loadProblems().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const problem = getProblem((await params).id);
  return { title: problem ? `${problem.title} · SysDesign Arena` : "Not found" };
}

export default async function ProblemPage({ params }: Params) {
  const problem = getProblem((await params).id);
  if (!problem) notFound();
  return <WorkspaceClient problem={problem} />;
}
