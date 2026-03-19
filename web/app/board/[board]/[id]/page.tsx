import PostDetail from "./PostDetail";

interface Props {
  params: Promise<{ board: string; id: string }>;
}

export default async function PostPage({ params }: Props) {
  const { board, id } = await params;
  return <PostDetail board={board} id={id} />;
}
