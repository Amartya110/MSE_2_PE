const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{1,50}$/;

export default function LegacyPublicProfileRoute() {
  return null;
}

export async function getServerSideProps({ params }) {
  const username = String(params.username ?? '');
  if (!USERNAME_PATTERN.test(username)) return { notFound: true };

  return {
    redirect: {
      destination: `/profile/${encodeURIComponent(username)}`,
      permanent: true,
    },
  };
}
