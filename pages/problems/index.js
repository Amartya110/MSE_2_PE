export default function LegacyProblemsetRoute() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/problemset',
      permanent: true,
    },
  };
}
