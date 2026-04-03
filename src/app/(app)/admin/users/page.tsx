
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User, TeacherPrivateDetails, PromoterPrivateDetails } from '@/lib/definitions';
import { UsersTable } from "@/components/admin/users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { ArrowLeft, PlusCircle, Search, X, Filter } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

const AddUserDialog = nextDynamic(
    () => import('@/components/admin/add-user-dialog').then(mod => mod.AddUserDialog), 
    { 
        ssr: false,
        loading: () => (
            <Button disabled>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
            </Button>
        )
    }
);

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

export default function AdminUsersPage() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const roleFilterParam = searchParams.get('role');
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(roleFilterParam || 'all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSyllabus, setSelectedSyllabus] = useState<string>('all');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const fetchUsers = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const usersCollection = collection(firestore, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      
      // Fetch details for teachers and promoters
      const usersWithDetails = await Promise.all(usersList.map(async (user) => {
          if (user.role === 'teacher') {
              const detailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
              const detailsSnap = await getDoc(detailsRef);
              if (detailsSnap.exists()) {
                  return { ...user, ...(detailsSnap.data() as TeacherPrivateDetails) };
              }
          } else if (user.role === 'promoter') {
              const detailsRef = doc(firestore, 'users', user.id, 'promoter_details', 'payment');
              const detailsSnap = await getDoc(detailsRef);
              if (detailsSnap.exists()) {
                  return { ...user, ...(detailsSnap.data() as PromoterPrivateDetails) };
              }
          }
          return user;
      }));
      
      setUsers(usersWithDetails.filter(Boolean));
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'users or subcollections',
          operation: 'list',
        }, { cause: e }));
      }
    } finally {
      setLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
        const name = user.name || '';
        const email = user.email || '';
        const matchesSearch = searchTerm === '' || 
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = selectedRole === 'all' || user.role === selectedRole;
        const matchesClass = selectedClass === 'all' ? true : (selectedClass === 'none' ? !user.class : user.class === selectedClass);
        const matchesSyllabus = selectedSyllabus === 'all' || user.syllabus === selectedSyllabus;
        const matchesExam = selectedExam === 'all' || user.competitiveExam === selectedExam;
        const matchesLevel = selectedLevel === 'all' ? true : (selectedLevel === 'none' ? !user.level : user.level === selectedLevel);

        return matchesSearch && matchesRole && matchesClass && matchesSyllabus && matchesExam && matchesLevel;
    });
  }, [users, searchTerm, selectedRole, selectedClass, selectedSyllabus, selectedExam, selectedLevel]);

  const resetFilters = () => {
      setSearchTerm('');
      setSelectedRole('all');
      setSelectedClass('all');
      setSelectedSyllabus('all');
      setSelectedExam('all');
      setSelectedLevel('all');
  };

  return (
    <div className="space-y-8">
        <Reveal>
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                  <Link href="/admin">
                    <ArrowLeft />
                  </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline">User Management</h1>
                    <p className="text-muted-foreground">Search, filter, and manage all user accounts.</p>
                </div>
              </div>
              <AddUserDialog creatorRole="admin" onUserAdded={fetchUsers} />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
            <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or email..." 
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" onClick={resetFilters} className="text-xs">
                            <X className="mr-2 h-3 w-3" /> Reset Filters
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Role</label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="promoter">Promoter</SelectItem>
                                    <SelectItem value="oga">OGA</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Class</label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Classes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Syllabus</label>
                            <Select value={selectedSyllabus} onValueChange={setSelectedSyllabus}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Syllabuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Syllabuses</SelectItem>
                                    {syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Level</label>
                            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                    {twenty20Levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Exams</label>
                            <Select value={selectedExam} onValueChange={setSelectedExam}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Exams" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Exams</SelectItem>
                                    {competitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Reveal>

        <Reveal delay={0.2}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                <CardDescription>A filtered list of users matching your criteria.</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="h-3 w-3" />
                  <span>Filtered View</span>
              </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <UsersTable users={filteredUsers} onUserUpdated={fetchUsers} />
                )}
            </CardContent>
          </Card>
        </Reveal>
    </div>
  );
}
