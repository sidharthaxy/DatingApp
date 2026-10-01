import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { homeRouteFor } from '@/src/lib/routing';

// The root layout shows the loading spinner until the stored session has been restored,
// so by the time this renders we know who (if anyone) is signed in.
export default function Index() {
  const user = useAuthStore((state) => state.user);
  return <Redirect href={homeRouteFor(user)} />;
}
