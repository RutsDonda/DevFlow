import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/helpers';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  return (
    <Card hover onClick={() => navigate(`/projects/${project._id}`)}>
      <Card.Header>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-100">{project.name}</h3>
          <StatusBadge status={project.status || 'active'} />
        </div>
      </Card.Header>
      <Card.Body>
        <p className="text-sm text-gray-400">{project.description}</p>
      </Card.Body>
      <Card.Footer>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created {formatDate(project.createdAt)}</span>
          <span>{project.tasks?.length || 0} tasks</span>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default ProjectCard;
